import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelegramContextTables1720000000000 implements MigrationInterface {
  name = 'CreateTelegramContextTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE telegram_messages (
        id bigserial PRIMARY KEY,
        chat_id bigint NOT NULL,
        message_id bigint NOT NULL,
        user_id bigint,
        username text,
        text text,
        created_at timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE chat_style_profiles (
        chat_id bigint PRIMARY KEY,
        style_summary text,
        updated_at timestamptz DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE chat_style_profiles');
    await queryRunner.query('DROP TABLE telegram_messages');
  }
}
