import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { createTypeOrmOptions } from './database/typeorm.config';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions
    }),
    TelegramModule
  ],
  controllers: [AppController]
})
export class AppModule {}
