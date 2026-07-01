
import { create } from "zustand";
import { Conversation, Message } from "../types/chat";
import { chatService } from "../services/chatService";

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  typingUsers: { id: number; name: string }[];
  _typingPollTimer: ReturnType<typeof setInterval> | null;
  _convPollTimer: ReturnType<typeof setInterval> | null;
  _msgPollTimer: ReturnType<typeof setInterval> | null;
  _lastMessageCount: number;
  _isPolling: boolean;

  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: Conversation) => Promise<void>;
  clearActiveConversation: () => void;
  sendMessage: (
    body: string,
    replyToId?: number,
    optimisticReplyTo?: Message,
    attachment?: string,
  ) => Promise<void>;
  sendBotReply: (body: string) => Promise<void>;
  createConversation: (
    type: "direct" | "group",
    memberIds: number[],
    name?: string,
  ) => Promise<Conversation>;
  addGroupMember: (userId: number) => Promise<void>;
  removeGroupMember: (userId: number) => Promise<void>;
  sendTyping: () => Promise<void>;
  startTypingPoll: () => void;
  stopTypingPoll: () => void;
  startPolling: () => void;
  stopPolling: () => void;
  startMessagePolling: () => void;
  stopMessagePolling: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: [],
  _typingPollTimer: null,
  _convPollTimer: null,
  _msgPollTimer: null,
  _lastMessageCount: 0,
  _isPolling: false,

  fetchConversations: async () => {
    try {
      const conversations = await chatService.getConversations();
      set({ conversations, loading: false });
    } catch (e: any) {
      if (e.message?.includes("429")) {
        console.warn("Rate limited, skipping conversations fetch");
        return;
      }
      set({ error: e.message, loading: false });
    }
  },

  startPolling: () => {
    const { _convPollTimer, fetchConversations } = get();
    if (_convPollTimer) return;

    fetchConversations();

    const timer = setInterval(() => {
      fetchConversations();
    }, 10000);
    set({ _convPollTimer: timer });
  },

  stopPolling: () => {
    const { _convPollTimer } = get();
    if (_convPollTimer) {
      clearInterval(_convPollTimer);
      set({ _convPollTimer: null });
    }
  },

  setActiveConversation: async (conversation) => {
    get().stopMessagePolling();
    get().stopTypingPoll();

    set({
      activeConversation: conversation,
      messages: [],
      loading: true,
      typingUsers: [],
      _lastMessageCount: 0,
    });

    try {
      const messages = await chatService.getMessages(conversation.id);
      await chatService.markRead(conversation.id);
      set({ messages, loading: false, _lastMessageCount: messages.length });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }

    setTimeout(() => {
      get().startMessagePolling();
      get().startTypingPoll();
    }, 1000);
  },

  clearActiveConversation: () => {
    get().stopMessagePolling();
    get().stopTypingPoll();
    set({
      activeConversation: null,
      messages: [],
      typingUsers: [],
      _lastMessageCount: 0,
      _isPolling: false,
    });
  },

  startMessagePolling: () => {
    const { _msgPollTimer } = get();
    if (_msgPollTimer) return;

    const timer = setInterval(async () => {
      const { activeConversation, messages, _isPolling } = get();
      if (!activeConversation || _isPolling) return;

      set({ _isPolling: true });
      try {
        const fresh = await chatService.getMessages(activeConversation.id);

        if (fresh.length !== messages.length) {
          set({ messages: fresh, _lastMessageCount: fresh.length });
          await chatService.markRead(activeConversation.id);
          get().fetchConversations();
        }
      } catch (e: any) {
        if (e.message?.includes("429")) {
          console.warn("Rate limited, skipping messages poll");
        }
      } finally {
        set({ _isPolling: false });
      }
    }, 5000);

    set({ _msgPollTimer: timer });
  },

  stopMessagePolling: () => {
    const { _msgPollTimer } = get();
    if (_msgPollTimer) {
      clearInterval(_msgPollTimer);
      set({ _msgPollTimer: null, _isPolling: false });
    }
  },

  sendMessage: async (body, replyToId, optimisticReplyTo, attachment) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    const tempId = -Date.now();
    const tempMessage: Message = {
      id: tempId,
      sender_id: 0,
      conversation_id: activeConversation.id,
      body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read_by: [],
      attachment: attachment || null,
      sender: { id: 0, name: "You", email: "" },
      reply_to: optimisticReplyTo,
      reply_to_id: replyToId,
    };

    set({ messages: [...messages, tempMessage] });

    try {
      const realMessage = await chatService.sendMessage(activeConversation.id, {
        body,
        reply_to_id: replyToId,
        attachment,
      });

      if (!realMessage.reply_to && optimisticReplyTo) {
        realMessage.reply_to = optimisticReplyTo;
        realMessage.reply_to_id = replyToId;
      }

      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === tempId ? realMessage : m,
        ),
      }));
      get().fetchConversations();
    } catch (e: any) {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
      }));
      set({ error: e.message });
      throw e;
    }
  },

  // Sends an automated reply as the support bot (correct sender_id from backend),
  // so it renders on the left like a real support message rather than being
  // attributed to the logged-in user.
  sendBotReply: async (body: string) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    try {
      const botMessage = await chatService.sendBotReply(
        activeConversation.id,
        body,
      );
      set((state) => ({
        messages: [...state.messages, botMessage],
      }));
      get().fetchConversations();
    } catch (e: any) {
      console.error("Bot reply failed:", e);
      set({ error: e.message });
    }
  },

  createConversation: async (type, memberIds, name) => {
    const conversation = await chatService.createConversation({
      type,
      member_ids: memberIds,
      name,
    });
    set((state) => ({
      conversations: state.conversations.find((c) => c.id === conversation.id)
        ? state.conversations
        : [conversation, ...state.conversations],
    }));
    return conversation;
  },

  addGroupMember: async (userId: number) => {
    const { activeConversation } = get();
    if (!activeConversation || activeConversation.type !== "group") return;
    try {
      await chatService.addMember(activeConversation.id, userId);
      await get().fetchConversations();
      const updated = get().conversations.find(
        (c) => c.id === activeConversation.id,
      );
      if (updated) set({ activeConversation: updated });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  removeGroupMember: async (userId: number) => {
    const { activeConversation } = get();
    if (!activeConversation || activeConversation.type !== "group") return;
    try {
      await chatService.removeMember(activeConversation.id, userId);
      await get().fetchConversations();
      const updated = get().conversations.find(
        (c) => c.id === activeConversation.id,
      );
      if (updated) set({ activeConversation: updated });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  sendTyping: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    try {
      await chatService.sendTyping(activeConversation.id);
    } catch {
      // ignore
    }
  },

  startTypingPoll: () => {
    const { _typingPollTimer } = get();
    if (_typingPollTimer) return;

    const timer = setInterval(async () => {
      const { activeConversation } = get();
      if (!activeConversation) return;
      try {
        const typingUsers = await chatService.getTyping(activeConversation.id);
        set({ typingUsers });
      } catch {
        // ignore
      }
    }, 4000);

    set({ _typingPollTimer: timer });
  },

  stopTypingPoll: () => {
    const { _typingPollTimer } = get();
    if (_typingPollTimer) {
      clearInterval(_typingPollTimer);
      set({ _typingPollTimer: null, typingUsers: [] });
    }
  },
}));
