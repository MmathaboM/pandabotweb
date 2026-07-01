// chatService.ts
import {
  Conversation,
  Message,
  SendMessagePayload,
  CreateConversationPayload,
} from "../types/chat";

const BASE_URL = "https://work.skillspanda.co.za/api/v1/chat";

const getHeaders = () => {
  const token = localStorage.getItem("pandabot_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => {
    const res = await fetch(`${BASE_URL}/conversations`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
  },

  getMessages: async (conversationId: number): Promise<Message[]> => {
    const res = await fetch(
      `${BASE_URL}/conversations/${conversationId}/messages`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  },

  sendMessage: async (
    conversationId: number,
    payload: SendMessagePayload,
  ): Promise<Message> => {
    const res = await fetch(
      `${BASE_URL}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          body: payload.body || null,
          attachment: payload.attachment || null,
          reply_to_id: payload.reply_to_id || null,
        }),
      },
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error("API Error:", errorText);
      throw new Error(`Failed to send message: ${res.status}`);
    }
    return res.json();
  },

  uploadAttachment: async (
    file: File,
  ): Promise<{ url: string; name: string; mime: string }> => {
    const token = localStorage.getItem("pandabot_token");
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `https://work.skillspanda.co.za/api/v1/chat/upload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );

    if (!res.ok) throw new Error("Failed to upload file");
    return res.json();
  },

  createConversation: async (
    payload: CreateConversationPayload,
  ): Promise<Conversation> => {
    const res = await fetch(`${BASE_URL}/conversations`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  },

  markRead: async (conversationId: number): Promise<void> => {
    await fetch(`${BASE_URL}/conversations/${conversationId}/read`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  sendTyping: async (conversationId: number): Promise<void> => {
    await fetch(`${BASE_URL}/conversations/${conversationId}/typing`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  getTyping: async (
    conversationId: number,
  ): Promise<{ id: number; name: string }[]> => {
    const res = await fetch(
      `${BASE_URL}/conversations/${conversationId}/typing`,
      { headers: getHeaders() },
    );
    if (!res.ok) return [];
    return res.json();
  },

  addMember: async (conversationId: number, userId: number): Promise<void> => {
    await fetch(`${BASE_URL}/groups/${conversationId}/members`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
  },

  removeMember: async (
    conversationId: number,
    userId: number,
  ): Promise<void> => {
    await fetch(`${BASE_URL}/groups/${conversationId}/members/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  sendBotReply: async (
    conversationId: number,
    body: string,
  ): Promise<Message> => {
    const res = await fetch(
      `${BASE_URL}/conversations/${conversationId}/bot-reply`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ body }),
      },
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Bot reply API Error:", errorText);
      throw new Error(`Failed to send bot reply: ${res.status}`);
    }
    return res.json();
  },
};
