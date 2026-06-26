export interface ConversationMember {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface AttachmentData {
  url: string;
  type: "image" | "document";
  name: string;
}
export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string | null;
  attachment: string | null;
  created_at: string;
  updated_at: string;
  sender: ConversationMember;
  read_by: number[];
  reply_to?: Message; 
  reply_to_id?: number;
  
}

export interface Conversation {
  id: number;
  type: "direct" | "group";
  name: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  latest_message: Message | null;
  unread_count?: number;
}

export interface SendMessagePayload {
  body?: string;
  attachment?: string;
  reply_to_id?: number;
}

export interface CreateConversationPayload {
  type: "direct" | "group";
  name?: string;
  member_ids: number[];
}
