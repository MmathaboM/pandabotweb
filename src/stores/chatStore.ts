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

  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: Conversation) => Promise<void>;
  clearActiveConversation: () => void;
  sendMessage: (
    body: string,
    replyToId?: number,
    optimisticReplyTo?: Message,
    attachment?: string,
  ) => Promise<void>;
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

  _convPollTimer: ReturnType<typeof setInterval> | null;
  _msgPollTimer: ReturnType<typeof setInterval> | null;
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

  fetchConversations: async () => {
    if (get().conversations.length === 0) {
      set({ loading: true, error: null });
    }
    try {
      const conversations = await chatService.getConversations();
      set({ conversations, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  startPolling: () => {
    const { _convPollTimer, fetchConversations } = get();
    if (_convPollTimer) return;
    fetchConversations();
    const timer = setInterval(() => {
      fetchConversations();
    }, 5000);
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
    });
    try {
      const messages = await chatService.getMessages(conversation.id);
      await chatService.markRead(conversation.id);
      set({ messages, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }

    get().startMessagePolling();
    get().startTypingPoll();
  },

  clearActiveConversation: () => {
    get().stopMessagePolling();
    get().stopTypingPoll();
    set({ activeConversation: null, messages: [], typingUsers: [] });
  },

  startMessagePolling: () => {
    const { _msgPollTimer } = get();
    if (_msgPollTimer) return;

    const timer = setInterval(async () => {
      const { activeConversation, messages } = get();
      if (!activeConversation) return;
      try {
        const fresh = await chatService.getMessages(activeConversation.id);

        const localMap = new Map(messages.map((m) => [m.id, m]));
        const merged = fresh.map((f) => {
          const local = localMap.get(f.id);
          if (local && local.reply_to && !f.reply_to) {
            return {
              ...f,
              reply_to: local.reply_to,
              reply_to_id: local.reply_to_id,
            };
          }
          return f;
        });

        const lastFresh = merged[merged.length - 1];
        const lastLocal = messages[messages.length - 1];
        const hasNew =
          merged.length !== messages.length ||
          (lastFresh && lastLocal && lastFresh.id !== lastLocal.id);

        set({ messages: merged });

        if (hasNew) {
          await chatService.markRead(activeConversation.id);
          get().fetchConversations();
        }
      } catch {
        // silent
      }
    }, 3000);

    set({ _msgPollTimer: timer });
  },

  stopMessagePolling: () => {
    const { _msgPollTimer } = get();
    if (_msgPollTimer) {
      clearInterval(_msgPollTimer);
      set({ _msgPollTimer: null });
    }
  },

  // ── Optimistic sendMessage with attachment ──────────────────────────────
  sendMessage: async (
    body: string,
    replyToId?: number,
    optimisticReplyTo?: Message,
    attachment?: string,
  ) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    const tempId = -Date.now();
    const tempMessage: Message = {
      id: tempId,
      sender_id: 0, // will be replaced
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

      set({
        messages: messages.map((m) => (m.id === tempId ? realMessage : m)),
      });
      get().fetchConversations();
    } catch (e: any) {
      set({ messages: messages.filter((m) => m.id !== tempId) });
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
    }, 2000);

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
