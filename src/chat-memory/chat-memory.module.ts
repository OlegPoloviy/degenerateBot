import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatStyleProfile } from '../telegram/entities/chat-style-profile.entity';
import { TelegramMessage } from '../telegram/entities/telegram-message.entity';
import { ChatMemoryService } from './chat-memory.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramMessage, ChatStyleProfile])],
  providers: [ChatMemoryService],
  exports: [ChatMemoryService]
})
export class ChatMemoryModule {}
