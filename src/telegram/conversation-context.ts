import { ChatMessageView } from '../chat-memory/chat-memory.service';

export function getMessageAuthor(message: Pick<ChatMessageView, 'username' | 'firstName'>): string {
  return message.username || message.firstName || 'unknown';
}

export function buildConversationContext(messages: ChatMessageView[]): string {
  return messages.map((message) => `${getMessageAuthor(message)}: ${message.text}`).join('\n');
}
