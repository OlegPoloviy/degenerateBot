import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramMessageAuthorAndIndex1720000001000 implements MigrationInterface {
  name = 'AddTelegramMessageAuthorAndIndex1720000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS first_name text');
    await queryRunner.query("UPDATE telegram_messages SET text = '' WHERE text IS NULL");
    await queryRunner.query('ALTER TABLE telegram_messages ALTER COLUMN text SET NOT NULL');
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id_created_at
      ON telegram_messages(chat_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_telegram_messages_chat_id_created_at');
    await queryRunner.query('ALTER TABLE telegram_messages ALTER COLUMN text DROP NOT NULL');
    await queryRunner.query('ALTER TABLE telegram_messages DROP COLUMN IF EXISTS first_name');
  }
}
