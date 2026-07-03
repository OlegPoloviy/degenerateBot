import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'telegram_messages' })
export class TelegramMessage {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'chat_id', type: 'bigint' })
  chatId!: string;

  @Column({ name: 'message_id', type: 'bigint' })
  messageId!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ type: 'text', nullable: true })
  username!: string | null;

  @Column({ name: 'first_name', type: 'text', nullable: true })
  firstName!: string | null;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
