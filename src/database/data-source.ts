import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ConfigReader, createDataSourceOptions } from './typeorm.config';

config();

const envConfigService: ConfigReader = {
  get<T = string>(key: string, defaultValue?: T): T {
    const value = process.env[key];
    return (value === undefined ? defaultValue : value) as T;
  }
};

export default new DataSource({
  ...createDataSourceOptions(envConfigService),
  migrations: ['src/database/migrations/*.ts']
});
