import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf } from "telegraf";
import { AiService } from "../ai/ai.service";
import { ChatMemoryService } from "../chat-memory/chat-memory.service";
import { ChatCooldown } from "./chat-cooldown";
import {
  buildConversationContext,
  getMessageAuthor,
} from "./conversation-context";
import { shouldBotReply, stripAskCommand } from "./reply-rules";

type TelegramTextContext = {
  chat: {
    id: number;
    type: string;
  };
  from?: {
    id: number;
    is_bot?: boolean;
    username?: string;
    first_name?: string;
  };
  message: {
    message_id: number;
    text: string;
  };
  reply(text: string, extra?: unknown): Promise<unknown>;
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly cooldown = new ChatCooldown();
  private bot: Telegraf | null = null;
  private botUsername = "";
  private isRunning = false;
  private messagesSinceStyleRebuild = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly chatMemory: ChatMemoryService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token =
      this.configService.get<string>("BOT_TOKEN") ??
      this.configService.get<string>("TELEGRAM_BOT_TOKEN");

    if (!token) {
      this.logger.warn("BOT_TOKEN is not set. Telegram polling is disabled.");
      return;
    }

    this.bot = new Telegraf(token);
    this.registerHandlers(this.bot);

    const botInfo = await this.bot.telegram.getMe();
    this.botUsername =
      this.configService.get<string>("BOT_USERNAME") || botInfo.username || "";

    await this.bot.launch({
      dropPendingUpdates: this.getBoolean("BOT_DROP_PENDING_UPDATES", true),
    });

    await this.refreshHealthStatus();
    this.logger.log(
      `Telegram bot started as @${this.botUsername || botInfo.username}`,
    );
  }

  onModuleDestroy(): void {
    this.isRunning = false;
    this.bot?.stop("NestJS shutdown");
  }

  private registerHandlers(bot: Telegraf): void {
    bot.start(async (ctx) => {
      await ctx.reply("живий, але морально нестабільний");
    });

    bot.help(async (ctx) => {
      await ctx.reply(
        ["/ask <текст>", "/rebuild_style", "/style", "/health"].join("\n"),
      );
    });

    bot.command("health", async (ctx) => {
      const isHealthy = await this.refreshHealthStatus();
      const statusEmoji = isHealthy ? "🟢" : "🔴";
      const statusText = isHealthy ? "піднятий і працює" : "не піднятий";

      await ctx.reply(`${statusEmoji} Статус бота: ${statusText}`);
    });

    bot.command("ask", async (ctx) => {
      await this.handleIncomingText(ctx as unknown as TelegramTextContext, {
        forceReply: true,
      });
    });

    bot.command("rebuild_style", async (ctx) => {
      await this.handleRebuildStyle(ctx as unknown as TelegramTextContext);
    });

    bot.command("style", async (ctx) => {
      await this.handleStyle(ctx as unknown as TelegramTextContext);
    });

    bot.on("text", async (ctx) => {
      await this.handleIncomingText(ctx as unknown as TelegramTextContext, {
        forceReply: false,
      });
    });

    bot.catch((error) => {
      this.logger.error("Telegram bot handler failed", error);
    });
  }

  private async handleIncomingText(
    ctx: TelegramTextContext,
    options: { forceReply: boolean },
  ): Promise<void> {
    if (!this.isGroupChat(ctx.chat.type) || ctx.from?.is_bot) {
      return;
    }

    const text = ctx.message.text.trim();

    if (!text) {
      return;
    }

    await this.chatMemory.saveTelegramMessage({
      chatId: ctx.chat.id,
      messageId: ctx.message.message_id,
      userId: ctx.from?.id,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      text,
    });

    void this.maybeRebuildStyleProfile(ctx.chat.id);

    if (text.length > this.getNumber("MAX_MESSAGE_LENGTH", 2000)) {
      return;
    }

    const shouldReply =
      options.forceReply ||
      shouldBotReply({
        text,
        botUsername: this.botUsername,
        replyChance: this.getNumber("BOT_REPLY_CHANCE", 0.03),
      });

    if (
      !shouldReply ||
      this.cooldown.isOnCooldown(
        ctx.chat.id,
        this.getNumber("BOT_REPLY_COOLDOWN_MS", 15000),
      )
    ) {
      return;
    }

    const userMessage = options.forceReply
      ? stripAskCommand(text) || text
      : text;

    await this.replyWithAi(ctx, userMessage);
  }

  private async replyWithAi(
    ctx: TelegramTextContext,
    userMessage: string,
  ): Promise<void> {
    try {
      const recentLimit = this.getNumber("RECENT_MESSAGES_LIMIT", 50);
      const [styleProfile, recentMessages] = await Promise.all([
        this.chatMemory.getStyleProfile(ctx.chat.id),
        this.chatMemory.getRecentMessages(ctx.chat.id, recentLimit),
      ]);

      const reply = await this.aiService.generateReply({
        styleProfile,
        conversationContext: buildConversationContext(recentMessages),
        userMessage,
      });

      await ctx.reply(reply, {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      });
    } catch (error) {
      this.logger.error("Failed to generate Telegram reply", error);
    }
  }

  private async handleRebuildStyle(ctx: TelegramTextContext): Promise<void> {
    if (!this.isGroupChat(ctx.chat.type)) {
      await ctx.reply("це працює тільки в групі");
      return;
    }

    await ctx.reply("аналізую стиль цього дурдому...");

    try {
      const styleProfile = await this.rebuildStyleProfile(ctx.chat.id);

      if (!styleProfile) {
        await ctx.reply("ще мало повідомлень для нормального style profile");
        return;
      }

      await ctx.reply("style profile оновлено, тепер я ще небезпечніший");
    } catch (error) {
      this.logger.error("Failed to rebuild style profile", error);
      await ctx.reply("не вивіз аналіз стилю, спробуй трохи пізніше");
    }
  }

  private async handleStyle(ctx: TelegramTextContext): Promise<void> {
    if (!this.isGroupChat(ctx.chat.type)) {
      await ctx.reply("це працює тільки в групі");
      return;
    }

    const styleProfile = await this.chatMemory.getStyleProfile(ctx.chat.id);

    if (!styleProfile) {
      await ctx.reply("style profile ще не зібраний");
      return;
    }

    await ctx.reply(styleProfile.slice(0, 3500));
  }

  private async refreshHealthStatus(): Promise<boolean> {
    if (!this.bot) {
      this.isRunning = false;
      return false;
    }

    try {
      await this.bot.telegram.getMe();
      this.isRunning = true;
      return true;
    } catch (error) {
      this.isRunning = false;
      this.logger.warn("Telegram health check failed", error);
      return false;
    }
  }

  private async maybeRebuildStyleProfile(chatId: number): Promise<void> {
    const rebuildEvery = this.getNumber("STYLE_REBUILD_EVERY_MESSAGES", 100);

    if (rebuildEvery <= 0) {
      return;
    }

    const key = String(chatId);
    const count = (this.messagesSinceStyleRebuild.get(key) ?? 0) + 1;

    if (count < rebuildEvery) {
      this.messagesSinceStyleRebuild.set(key, count);
      return;
    }

    this.messagesSinceStyleRebuild.set(key, 0);

    try {
      await this.rebuildStyleProfile(chatId);
    } catch (error) {
      this.logger.error("Automatic style profile rebuild failed", error);
    }
  }

  private async rebuildStyleProfile(chatId: number): Promise<string | null> {
    const messages = await this.chatMemory.getMessagesForStyleProfile(
      chatId,
      this.getNumber("STYLE_SAMPLE_LIMIT", 1000),
    );

    if (messages.length < this.getNumber("MIN_STYLE_MESSAGES", 20)) {
      return null;
    }

    const styleProfile = await this.aiService.generateStyleProfile(
      messages.map((message) => ({
        author: getMessageAuthor(message),
        text: message.text,
      })),
    );

    await this.chatMemory.saveStyleProfile(chatId, styleProfile);

    return styleProfile;
  }

  private isGroupChat(type: string): boolean {
    return type === "group" || type === "supergroup";
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);

    if (value === undefined) {
      return defaultValue;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = this.configService.get<string>(key);
    return value === undefined ? defaultValue : Number(value);
  }
}
