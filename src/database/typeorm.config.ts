import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { ChatStyleProfile } from '../telegram/entities/chat-style-profile.entity';
import { TelegramMessage } from '../telegram/entities/telegram-message.entity';

export type ConfigReader = Pick<ConfigService, 'get'>;

function isEnabled(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase());
}

function getNumber(configService: ConfigReader, key: string, defaultValue: number): number {
  const value = configService.get<string>(key);
  return value === undefined ? defaultValue : Number(value);
}

export function createDataSourceOptions(configService: ConfigReader): DataSourceOptions {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const ssl = isEnabled(configService.get<string>('DB_SSL'));

  const baseOptions: DataSourceOptions = {
    type: 'postgres',
    entities: [TelegramMessage, ChatStyleProfile],
    migrations: ['dist/database/migrations/*.js'],
    synchronize: false,
    ssl: ssl ? { rejectUnauthorized: false } : false
  };

  if (databaseUrl) {
    return {
      ...baseOptions,
      url: databaseUrl
    };
  }

  return {
    ...baseOptions,
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: getNumber(configService, 'DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_DATABASE', 'six_seven_bot')
  };
}

export function createTypeOrmOptions(configService: ConfigReader): TypeOrmModuleOptions {
  return createDataSourceOptions(configService);
}
