export const MAX_MESSAGE_LENGTH = 2000;

export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  text: string;
}

// Un timeout no implica que el servidor haya rechazado el mensaje.
export type SendResult = { status: 'sent'; message: ChatMessage } | { status: 'failed' | 'unconfirmed' };
export type SendMessage = (text: string) => Promise<SendResult>;
