export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  streamId: string;
  room: string;
  username: string;
  avatar?: string;
  isDeleted: boolean;
  isModerator: boolean;
  isSubscriber: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface CreateChatMessageRequest {
  streamId: string;
  content: string;
}

export interface ChatStats {
  totalMessages: number;
  uniqueUsers: number;
}

export interface TopChatter {
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  messageCount: number;
}
