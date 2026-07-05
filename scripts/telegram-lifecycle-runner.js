#!/usr/bin/env node

const { mkdir, readFile, writeFile } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { join } = require("node:path");
const { resolve } = require("node:path");
const dotenv = require("dotenv");

const CHAT_ID = -1002394090800;
const RUNTIME_DIR = join(process.cwd(), ".runtime");
const STATE_FILE = join(RUNTIME_DIR, "telegram-lifecycle-state.json");

dotenv.config();

const mode = process.argv[2] || "dev";

const COMMANDS = {
  dev: [process.execPath, [resolve("node_modules/@nestjs/cli/bin/nest.js"), "start", "--watch"]],
  start: [process.execPath, [resolve("node_modules/@nestjs/cli/bin/nest.js"), "start"]],
  prod: [process.execPath, [resolve("dist/main.js")]],
};

const command = COMMANDS[mode];
if (!command) {
  console.error(`Unknown runner mode: ${mode}`);
  process.exit(1);
}

let child = null;
let startedNotified = false;
let shutdownNotified = false;

async function main() {
  await deleteStoredMessages();
  child = spawn(command[0], command[1], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.on("spawn", () => {
    void notifyStarted();
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function notifyStarted() {
  if (startedNotified) {
    return;
  }

  startedNotified = true;

  const messageId = await sendTelegramMessage("🟢 Я запустився");
  if (messageId === null) {
    return;
  }

  await writeState({
    activeRunMessageIds: [messageId],
    lastCompletedRunMessageIds: [],
  });
}

async function handleShutdown(signal) {
  if (shutdownNotified) {
    return;
  }

  shutdownNotified = true;

  const messageId = await sendTelegramMessage(`🔴 Готуюся до зупинки (${signal})`);
  const state = await readState();

  await writeState({
    activeRunMessageIds: [],
    lastCompletedRunMessageIds: messageId === null
      ? state.activeRunMessageIds
      : [...state.activeRunMessageIds, messageId],
  });

  if (child && !child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => {
  void handleShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void handleShutdown("SIGTERM");
});

process.on("SIGHUP", () => {
  void handleShutdown("SIGHUP");
});

async function sendTelegramMessage(text) {
  const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("BOT_TOKEN is not set");
    return null;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok || !result.result?.message_id) {
      console.error("Failed to send lifecycle message", result.description || response.statusText);
      return null;
    }

    return result.result.message_id;
  } catch (error) {
    console.error("Failed to send lifecycle message", error);
    return null;
  }
}

async function deleteStoredMessages() {
  const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return;
  }

  const state = await readState();
  const messageIds = [...state.lastCompletedRunMessageIds, ...state.activeRunMessageIds];

  for (const messageId of messageIds) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          message_id: messageId,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        console.error(
          `Failed to delete lifecycle message ${messageId}`,
          result.description || response.statusText,
        );
      }
    } catch (error) {
      console.error(`Failed to delete lifecycle message ${messageId}`, error);
    }
  }

  await writeState({
    activeRunMessageIds: [],
    lastCompletedRunMessageIds: [],
  });
}

async function readState() {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return {
      activeRunMessageIds: Array.isArray(parsed.activeRunMessageIds)
        ? parsed.activeRunMessageIds.filter(Number.isInteger)
        : [],
      lastCompletedRunMessageIds: Array.isArray(parsed.lastCompletedRunMessageIds)
        ? parsed.lastCompletedRunMessageIds.filter(Number.isInteger)
        : [],
    };
  } catch {
    return {
      activeRunMessageIds: [],
      lastCompletedRunMessageIds: [],
    };
  }
}

async function writeState(state) {
  await mkdir(RUNTIME_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state), "utf8");
}

void main();
