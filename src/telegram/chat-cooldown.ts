export class ChatCooldown {
  private readonly lastReplyByChatId = new Map<string, number>();

  isOnCooldown(chatId: number | string, cooldownMs: number): boolean {
    const key = String(chatId);
    const now = Date.now();
    const lastReplyAt = this.lastReplyByChatId.get(key) ?? 0;

    if (now - lastReplyAt < cooldownMs) {
      return true;
    }

    this.lastReplyByChatId.set(key, now);
    return false;
  }
}
