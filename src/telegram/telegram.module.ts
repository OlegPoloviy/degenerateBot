import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ChatMemoryModule } from '../chat-memory/chat-memory.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AiModule, ChatMemoryModule],
  providers: [TelegramService]
})
export class TelegramModule {}
