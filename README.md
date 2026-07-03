# Six Seven Bot

NestJS backend for a Telegram group bot that stores message context, tracks the chat's communication style, and replies through Gemini in the same vibe.

## Stack

- NestJS
- TypeORM
- PostgreSQL
- Telegraf
- Gemini API

## Setup

```bash
pnpm install
```

Copy the variables from `.env.example` into your existing `.env`.

Important variables:

```env
BOT_TOKEN=...
BOT_USERNAME=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.1-flash-lite
DATABASE_URL=postgres://postgres:postgres@localhost:5432/six_seven_bot
```

Start local PostgreSQL if needed:

```bash
docker compose up -d
```

Run migrations:

```bash
pnpm run migration:run
```

Start the app:

```bash
pnpm run start:dev
```

The app exposes `GET /health`.

## Bot Commands

```txt
/ask <text>
/rebuild_style
/style
```

For the bot to read all group messages, disable privacy mode in BotFather or make the bot an admin in the group.
