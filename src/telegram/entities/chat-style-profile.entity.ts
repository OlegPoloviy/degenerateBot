import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'chat_style_profiles' })
export class ChatStyleProfile {
  @PrimaryColumn({ name: 'chat_id', type: 'bigint' })
  chatId!: string;

  @Column({ name: 'style_summary', type: 'text', nullable: true })
  styleSummary!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
