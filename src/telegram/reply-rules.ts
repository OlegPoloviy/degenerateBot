export function shouldBotReply(input: {
  text: string;
  botUsername: string;
  replyChance: number;
}): boolean {
  const text = input.text.toLowerCase();
  const botUsername = input.botUsername.toLowerCase();

  if (botUsername && text.includes(`@${botUsername}`)) {
    return true;
  }

  if (text.startsWith('/ask')) {
    return true;
  }

  if (text.includes('бот')) {
    return Math.random() < 0.5;
  }

  return Math.random() < input.replyChance;
}

export function stripAskCommand(text: string): string {
  return text.replace(/^\/ask(@\w+)?\s*/i, '').trim();
}
