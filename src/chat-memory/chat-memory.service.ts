import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatStyleProfile } from '../telegram/entities/chat-style-profile.entity';
import { TelegramMessage } from '../telegram/entities/telegram-message.entity';

export interface ChatMessageView {
  username: string | null;
  firstName: string | null;
  text: string;
  createdAt: Date;
}

@Injectable()
export class ChatMemoryService {
  constructor(
    @InjectRepository(TelegramMessage)
    private readonly telegramMessages: Repository<TelegramMessage>,
    @InjectRepository(ChatStyleProfile)
    private readonly chatStyleProfiles: Repository<ChatStyleProfile>
  ) {}

  async saveTelegramMessage(input: {
    chatId: number | string;
    messageId: number | string;
    userId?: number | string;
    username?: string;
    firstName?: string;
    text: string;
  }): Promise<void> {
    await this.telegramMessages.insert({
      chatId: String(input.chatId),
      messageId: String(input.messageId),
      userId: input.userId === undefined ? null : String(input.userId),
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      text: input.text
    });
  }

  async getRecentMessages(chatId: number | string, limit: number): Promise<ChatMessageView[]> {
    const messages = await this.telegramMessages.find({
      where: { chatId: String(chatId) },
      order: { createdAt: 'DESC' },
      take: limit
    });

    return messages.reverse().map(this.toView);
  }

  async getMessagesForStyleProfile(
    chatId: number | string,
    limit: number
  ): Promise<ChatMessageView[]> {
    return this.getRecentMessages(chatId, limit);
  }

  async getStyleProfile(chatId: number | string): Promise<string | null> {
    const profile = await this.chatStyleProfiles.findOne({
      where: { chatId: String(chatId) }
    });

    return profile?.styleSummary ?? null;
  }

  async saveStyleProfile(chatId: number | string, styleSummary: string): Promise<void> {
    await this.chatStyleProfiles.upsert(
      {
        chatId: String(chatId),
        styleSummary,
        updatedAt: new Date()
      },
      ['chatId']
    );
  }

  private toView(message: TelegramMessage): ChatMessageView {
    return {
      username: message.username,
      firstName: message.firstName,
      text: message.text,
      createdAt: message.createdAt
    };
  }
}
