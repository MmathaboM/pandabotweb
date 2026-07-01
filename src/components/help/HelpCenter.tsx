import React, { useState, useRef, useEffect, useCallback } from "react";
import PageHeader from "../../components/PageHeader";
import { useChatStore } from "../../stores/chatStore";
import type { Conversation, Message } from "../../types/chat";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HelpItemProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  onClick: () => void;
}

interface HelpCenterProps {
  onClose?: () => void;
  onBack?: () => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MANUAL_URL =
  "https://crm.skillspanda.co.za/videos/guides/pandaBot_User_Manual.pdf";
const SUPPORT_AGENT_ID = 547;

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Why can't I access the Academy?",
    answer:
      "Academy access is for registered students and learners enrolled in our programs. If you're enrolled but can't access it, please contact support with your enrollment details.",
  },
  {
    question: "How do I update my profile?",
    answer:
      "Go to your Profile tab at the bottom of the screen, tap 'Edit Profile', make your changes, and tap Save. You can update your photo, name, contact details, and more.",
  },
  {
    question: "How do I apply for opportunities?",
    answer:
      "Tap the Opportunities card on the home screen or use the Opportunities tab. Browse available positions, tap on one you're interested in, and follow the application instructions.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can chat with our support team by going to the Chat tab and selecting Support, or email us at support@skillspanda.co.za. We typically respond within 24 hours.",
  },
];

// ─── Icons ─────────────────────────────────────────────────────────────────────
const IconMail = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconChat = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconHelp = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconChevronRight = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconChevronDown = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconChevronUp = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const IconX = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconExternalLink = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconDownload = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconSend = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconUser = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconBot = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ─── Components ──────────────────────────────────────────────────────────────
const HelpItem: React.FC<HelpItemProps> = ({ icon, iconColor, title, description, onClick }) => (
  <button className="help-item" onClick={onClick}>
    <span className="help-icon" style={{ backgroundColor: iconColor + "18" }}>{icon}</span>
    <span className="help-content">
      <span className="help-title">{title}</span>
      <span className="help-desc">{description}</span>
    </span>
    <IconChevronRight color="#9AA5B1" />
  </button>
);

// ─── Message Bubble ──────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ message: Message; currentUserId: number }> = ({ 
  message, 
  currentUserId 
}) => {
  const isUser = message.sender_id === currentUserId;
  const isBot = message.sender_id === SUPPORT_AGENT_ID && message.body?.includes('🤖');
  const isSupport = message.sender_id === SUPPORT_AGENT_ID && !isBot;

  return (
    <div className={`message-bubble ${isUser ? "user" : "support"}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar-user"><IconUser color="#FFFFFF" /></div>
        ) : isBot ? (
          <div className="avatar-bot"><IconBot color="#FFFFFF" /></div>
        ) : (
          <div className="avatar-support">🐼</div>
        )}
      </div>
      <div className="message-content">
        {isSupport && message.sender && (
          <div className="message-sender">{message.sender.name || message.sender.first_name}</div>
        )}
        {isBot && <div className="message-sender">🤖 Panda Bot</div>}
        <div className="message-text">{message.body}</div>
        <div className="message-time">
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
};

// ─── Auto Responses ──────────────────────────────────────────────────────────
const AUTO_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["schedule", "timetable", "session", "class time"],
    response: "🤖 **To view your schedule:**\n\n1. Go to **Academy** > **Schedules**\n2. See all upcoming training sessions\n3. Tap any session for full details (venue, facilitator, time)",
  },
  {
    keywords: ["check in", "checkin", "attendance", "arrive", "present", "location", "gps"],
    response: "🤖 **To check in for training:**\n\n1. Navigate to **Academy** tab\n2. Tap **Check In**\n3. Ensure GPS is enabled\n4. You must be within 200m of the venue\n5. Check-in opens 15 minutes before class starts",
  },
  {
    keywords: ["course", "courses", "learning", "lms", "study", "portal", "access"],
    response: "🤖 **To access your courses:**\n\n1. Go to **Academy**\n2. Tap **Learning Portal**\n3. Use your app email and password to login",
  },
  {
    keywords: ["pay", "salary", "stipend", "earn", "earnings", "money", "paid", "payment"],
    response: "🤖 **Payment Information:**\n\n• Check earnings in **Academy** > **Earnings**\n• View payslips in **Academy** > **Payslips**\n• Payment dates vary by program",
  },
  {
    keywords: ["login", "password", "can't access", "forgot", "reset"],
    response: "🤖 **Having trouble logging in?**\n\n1. Tap **Forgot Password** on the login screen\n2. Enter your registered email\n3. Check your email for the reset link",
  },
  {
    keywords: ["apply", "job", "opportunity", "position"],
    response: "🤖 **Applying for opportunities:**\n\n1. Browse jobs in the **Opportunities** tab\n2. Tap any listing for full details\n3. Click **Apply** (ensure profile is complete)",
  },
  {
    keywords: ["hi", "hello", "hey", "good morning"],
    response: "🤖 Hello! I'm the Panda Bot assistant.\n\nHere are some things I can help with:\n• 📍 **How to check in**\n• 📅 **View my schedule**\n• 🎓 **Access courses**\n• 💰 **Payments & earnings**\n• 🔑 **Login issues**\n• 💼 **Job opportunities**",
  },
];

const QUICK_REPLIES = [
  { label: "📍 Check-in", text: "How do I check in?" },
  { label: "📅 Schedule", text: "How do I view my schedule?" },
  { label: "🎓 Courses", text: "How do I access my courses?" },
  { label: "💰 Payment", text: "When do I get paid?" },
  { label: "🔑 Login", text: "I can't login" },
  { label: "💼 Jobs", text: "How do I apply for jobs?" },
];

// ─── Main Component ──────────────────────────────────────────────────────────
const HelpCenter: React.FC<HelpCenterProps> = ({ onClose, onBack }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [manualVisible, setManualVisible] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"faq" | "chat">("faq");
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const {
    conversations,
    activeConversation,
    messages,
    fetchConversations,
    setActiveConversation,
    clearActiveConversation,
    sendMessage,
    createConversation,
    startPolling,
    stopPolling,
    startMessagePolling,
    stopMessagePolling,
    typingUsers,
  } = useChatStore();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ─── Track which messages got auto-response ──────────────────────────────
  const respondedMessages = useRef<Set<number>>(new Set());
  const autoResponseTimer = useRef<NodeJS.Timeout | null>(null);

  // ─── Get current user ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || 0);
      }
    } catch (e) {
      console.error('Error getting user:', e);
    }
  }, []);

  // ─── Load conversation ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadConversation = async () => {
      try {
        setLoading(true);
        if (conversations.length === 0) await fetchConversations();

        let supportConv = conversations.find((c: Conversation) => 
          c.type === "direct" && c.members.some((m) => m.id === SUPPORT_AGENT_ID)
        );

        if (!supportConv) {
          supportConv = await createConversation("direct", [SUPPORT_AGENT_ID]);
        }

        if (supportConv) {
          await setActiveConversation(supportConv);
          startPolling();
          startMessagePolling();
        }
      } catch (err: any) {
        console.error("Error loading conversation:", err);
        setError(err.message || "Failed to load support chat");
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
    return () => {
      stopPolling();
      stopMessagePolling();
      clearActiveConversation();
      if (autoResponseTimer.current) {
        clearTimeout(autoResponseTimer.current);
        autoResponseTimer.current = null;
      }
    };
  }, []);

  // ─── Auto-respond to messages ─────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0 || !activeConversation) return;

    const lastMsg = messages[messages.length - 1];
    
    // Skip if:
    // - Already responded to this message
    // - Message is from support/bot
    // - There's already a bot response after it
    if (respondedMessages.current.has(lastMsg.id)) return;
    if (lastMsg.sender_id === SUPPORT_AGENT_ID) return;
    
    const hasBotResponseAfter = messages.some(m => 
      m.sender_id === SUPPORT_AGENT_ID && 
      m.created_at > lastMsg.created_at
    );
    if (hasBotResponseAfter) {
      respondedMessages.current.add(lastMsg.id);
      return;
    }

    // Mark as responded immediately (prevent duplicates)
    respondedMessages.current.add(lastMsg.id);

    // Find matching response
    const body = lastMsg.body || "";
    const match = AUTO_RESPONSES.find(r => 
      r.keywords.some(k => body.toLowerCase().includes(k))
    );

    // Show typing indicator
    setIsBotTyping(true);

    // Clear any existing timer
    if (autoResponseTimer.current) {
      clearTimeout(autoResponseTimer.current);
      autoResponseTimer.current = null;
    }

    // Send response after delay
    const delay = match ? 1500 : 2500;
    autoResponseTimer.current = setTimeout(async () => {
      try {
        const response = match 
          ? match.response 
          : "🤖 Thanks for your message! Our support team will respond shortly.\n\n💡 In the meantime, check our FAQ section for quick answers.";
        
        await sendMessage(response);
      } catch (err) {
        console.error("Error sending auto-response:", err);
      } finally {
        setIsBotTyping(false);
        autoResponseTimer.current = null;
      }
    }, delay);

    return () => {
      if (autoResponseTimer.current) {
        clearTimeout(autoResponseTimer.current);
        autoResponseTimer.current = null;
      }
    };
  }, [messages, activeConversation]);

  // ─── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Focus input ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "chat" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [activeTab]);

  const toggleFaq = (i: number) => setExpandedFaq(expandedFaq === i ? null : i);

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputMessage.trim() || !activeConversation || isSending) return;
    const body = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);
    try {
      await sendMessage(body);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInputMessage(text);
    setTimeout(() => handleSend(), 150);
  };

  const handleBack = () => {
    if (activeTab !== "faq") {
      setActiveTab("faq");
      return;
    }
    if (onBack) onBack();
    else if (onClose) onClose();
    else history.back();
  };

  const getTypingText = (): string | null => {
    if (isBotTyping) return "🤖 Panda Bot is typing...";
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map(u => u.name || "Someone");
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names.length} people are typing...`;
  };

  const handleEmailSupport = () => {
    window.location.href = "mailto:support@skillspanda.co.za?subject=Help%20Request";
  };

  const handleOpenManualExternal = () => window.open(MANUAL_URL, "_blank");
  
  const handleDownloadManual = () => {
    const a = document.createElement("a");
    a.href = MANUAL_URL;
    a.download = "pandaBot_User_Manual.pdf";
    a.target = "_blank";
    a.click();
  };

  // ─── Check if input should be disabled ────────────────────────────────────
  const isInputDisabled = isSending;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; }

        .hc-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100dvh;
          background: #F8F9FA;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
        }

        .hc-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .hc-tabs {
          display: flex;
          background: #FFFFFF;
          border-bottom: 1px solid #E4E7EB;
          padding: 0 20px;
          flex-shrink: 0;
        }
        .hc-tab {
          flex: 1;
          padding: 14px 0;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: #9AA5B1;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .hc-tab.active { color: #fb8500; }
        .hc-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 20%;
          width: 60%;
          height: 3px;
          background: #fb8500;
          border-radius: 3px 3px 0 0;
        }
        .hc-tab-badge {
          background: #fb8500;
          color: white;
          font-size: 10px;
          padding: 1px 8px;
          border-radius: 10px;
          font-weight: 700;
        }

        .hc-scroll {
          flex: 1;
          overflow-y: auto;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
          padding: 20px 20px 0 20px;
        }

        .hc-intro {
          font-size: 14px;
          color: #616E7C;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .hc-section { margin-bottom: 28px; }
        .hc-section-title {
          font-size: 11px;
          font-weight: 600;
          color: #9AA5B1;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
        }

        .hc-card {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E4E7EB;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .help-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .help-item:hover { background: #F8F9FA; }
        .help-icon {
          width: 44px; height: 44px; flex-shrink: 0;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .help-content { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .help-title { font-size: 15px; font-weight: 600; color: #1F2933; }
        .help-desc { font-size: 13px; color: #616E7C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hc-divider { height: 1px; background: #E4E7EB; margin: 0 16px; }

        .faq-item { border: none; background: transparent; width: 100%; text-align: left; }
        .faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .faq-trigger:hover { background: #F8F9FA; }
        .faq-question { flex: 1; font-size: 14px; font-weight: 500; color: #1F2933; line-height: 1.4; }
        .faq-answer {
          font-size: 13.5px;
          color: #616E7C;
          line-height: 1.65;
          padding: 0 16px 16px 44px;
          animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        .chat-wrapper { display: flex; flex-direction: column; height: 100%; padding-bottom: 10px; }
        .chat-container { display: flex; flex-direction: column; flex: 1; }

        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #E4E7EB;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .chat-header-info .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #FFF5EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .chat-header-info .info .name { font-weight: 600; color: #1F2933; font-size: 15px; }
        .chat-header-info .info .status { font-size: 12px; color: #00CD50; }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 55vh;
          min-height: 300px;
        }

        .message-bubble {
          display: flex;
          gap: 10px;
          max-width: 85%;
          animation: msgIn 0.2s ease;
        }
        @keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .message-bubble.user { align-self: flex-end; flex-direction: row-reverse; }
        .message-bubble.support { align-self: flex-start; }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar-user { background: #5784E8; }
        .avatar-support { background: #FFF5EB; font-size: 18px; }
        .avatar-bot { background: #fb8500; font-size: 16px; }

        .message-content { display: flex; flex-direction: column; gap: 2px; max-width: 100%; }
        .message-sender { font-size: 11px; font-weight: 600; color: #9AA5B1; padding: 0 4px; }
        .message-text {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .message-bubble.user .message-text { background: #fb8500; color: #FFFFFF; border-bottom-right-radius: 4px; }
        .message-bubble.support .message-text { background: #FFFFFF; color: #1F2933; border-bottom-left-radius: 4px; border: 1px solid #E4E7EB; }
        .message-time { font-size: 10px; color: #9AA5B1; padding: 0 4px; }
        .message-bubble.user .message-time { text-align: right; }

        .typing-indicator-container {
          padding: 8px 0 4px 0;
          font-size: 13px;
          color: #9AA5B1;
          font-style: italic;
          min-height: 24px;
          flex-shrink: 0;
        }

        .quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 0;
          border-top: 1px solid #F5F7FA;
          flex-shrink: 0;
        }
        .quick-reply-btn {
          padding: 6px 14px;
          border-radius: 16px;
          border: 1px solid #E4E7EB;
          background: #FFFFFF;
          font-size: 12px;
          color: #1F2933;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }
        .quick-reply-btn:hover { border-color: #fb8500; background: #FFF5EB; }
        .quick-reply-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .chat-input-wrapper {
          flex-shrink: 0;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
          background: #F8F9FA;
          padding: 12px 20px 16px 20px;
          border-top: 1px solid #E4E7EB;
          position: sticky;
          bottom: 0;
          z-index: 10;
        }
        .chat-input-area {
          display: flex;
          gap: 10px;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 6px 6px 6px 14px;
          border: 1px solid #E4E7EB;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .chat-input-area input {
          flex: 1;
          padding: 10px 0;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          color: #1F2933;
        }
        .chat-input-area input::placeholder { color: #9AA5B1; }
        .chat-input-area input:disabled { opacity: 0.6; cursor: not-allowed; }
        .chat-input-area button {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: #fb8500;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.12s;
        }
        .chat-input-area button:hover { opacity: 0.85; }
        .chat-input-area button:disabled { opacity: 0.4; cursor: not-allowed; }

        .loading-state { text-align: center; padding: 40px 20px; color: #9AA5B1; }
        .loading-state .spinner {
          width: 32px; height: 32px;
          border: 3px solid #E4E7EB;
          border-top-color: #fb8500;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .error-state { text-align: center; padding: 40px 20px; color: #D32F2F; }
        .error-state .retry-btn { margin-top: 12px; padding: 8px 24px; border-radius: 8px; border: 1px solid #D32F2F; background: transparent; color: #D32F2F; cursor: pointer; font-weight: 500; }
        .empty-state { text-align: center; padding: 40px 20px; color: #9AA5B1; }

        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          animation: backdropIn 0.2s ease;
        }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-sheet {
          background: #FFFFFF;
          border-top-left-radius: 22px;
          border-top-right-radius: 22px;
          width: 100%;
          max-width: 720px;
          padding: 16px 16px 28px;
          animation: sheetUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes sheetUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; }
        .modal-title { flex: 1; font-size: 16px; font-weight: 700; color: #1F2933; }
        .modal-close-btn { width: 36px; height: 36px; border-radius: 10px; background: #F5F7FA; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.12s; }
        .modal-close-btn:hover { background: #E4E7EB; }
        .pdf-wrap { height: 420px; border-radius: 14px; overflow: hidden; border: 1px solid #E4E7EB; background: #F8F9FA; position: relative; }
        .pdf-wrap iframe { width: 100%; height: 100%; border: none; }
        .pdf-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: rgba(255,255,255,0.85); }
        .spinner { width: 28px; height: 28px; border: 3px solid #E4E7EB; border-top-color: #fb8500; border-radius: 50%; animation: spin 0.7s linear infinite; }

        .modal-actions { display: flex; gap: 12px; margin-top: 14px; }
        .action-btn { flex: 1; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s, transform 0.1s; }
        .action-btn:hover { opacity: 0.88; }
        .action-btn:active { transform: scale(0.97); }
        .btn-primary { background: #fb8500; color: #FFFFFF; }
        .btn-secondary { background: #F5F7FA; color: #1F2933; border: 1px solid #E4E7EB; }
        .modal-hint { margin-top: 10px; font-size: 12px; color: #9AA5B1; text-align: center; }

        @media (max-width: 480px) {
          .hc-scroll { padding: 16px 16px 0 16px; }
          .pdf-wrap { height: 300px; }
          .chat-messages { max-height: 45vh; min-height: 200px; }
          .chat-input-wrapper { padding: 8px 12px 12px 12px; }
        }
      `}</style>

      <div className="hc-root">
        <PageHeader title="Help Center" onBack={handleBack} />

        <div className="hc-tabs">
          <button className={`hc-tab ${activeTab === "faq" ? "active" : ""}`} onClick={() => setActiveTab("faq")}>
            📚 FAQ
          </button>
          <button className={`hc-tab ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
            💬 Support Chat
            {activeConversation?.unread_count && activeConversation.unread_count > 0 && (
              <span className="hc-tab-badge">{activeConversation.unread_count}</span>
            )}
          </button>
        </div>

        <div className="hc-content">
          <div className="hc-scroll">
            {activeTab === "faq" && (
              <>
                <p className="hc-intro">Find answers to common questions or chat with our support team.</p>
                <section className="hc-section">
                  <p className="hc-section-title">Quick Actions</p>
                  <div className="hc-card">
                    <HelpItem
                      icon={<IconMail color="#00CD50" />}
                      iconColor="#00CD50"
                      title="User Guide"
                      description="Open the PandaBot user manual (PDF)"
                      onClick={() => { setManualVisible(true); setPdfLoading(true); }}
                    />
                    <div className="hc-divider" />
                    <HelpItem
                      icon={<IconChat color="#5784E8" />}
                      iconColor="#5784E8"
                      title="Chat with Support"
                      description="Talk to our support team"
                      onClick={() => setActiveTab("chat")}
                    />
                    <div className="hc-divider" />
                    <HelpItem
                      icon={<IconMail color="#00CD50" />}
                      iconColor="#00CD50"
                      title="Email Us"
                      description="support@skillspanda.co.za"
                      onClick={handleEmailSupport}
                    />
                  </div>
                </section>

                <section className="hc-section">
                  <p className="hc-section-title">Frequently Asked Questions</p>
                  <div className="hc-card">
                    {FAQ_ITEMS.map((item, i) => (
                      <div key={i} className="faq-item">
                        {i > 0 && <div className="hc-divider" />}
                        <button className="faq-trigger" onClick={() => toggleFaq(i)} aria-expanded={expandedFaq === i}>
                          <IconHelp color="#fb8500" />
                          <span className="faq-question">{item.question}</span>
                          {expandedFaq === i ? <IconChevronUp color="#9AA5B1" /> : <IconChevronDown color="#9AA5B1" />}
                        </button>
                        {expandedFaq === i && <p className="faq-answer">{item.answer}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {activeTab === "chat" && (
              <div className="chat-wrapper">
                <div className="chat-container">
                  {loading ? (
                    <div className="loading-state"><div className="spinner" /><p>Loading conversation...</p></div>
                  ) : error ? (
                    <div className="error-state">
                      <p>❌ {error}</p>
                      <button className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
                    </div>
                  ) : (
                    <>
                      <div className="chat-header-info">
                        <div className="avatar">🐼</div>
                        <div className="info">
                          <div className="name">Panda Support</div>
                          <div className="status">🟢 Online</div>
                        </div>
                      </div>

                      <div className="chat-messages" ref={chatContainerRef}>
                        {messages.length === 0 ? (
                          <div className="empty-state"><p>No messages yet. Start a conversation!</p></div>
                        ) : (
                          messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId} />
                          ))
                        )}
                      </div>

                      <div className="typing-indicator-container">{getTypingText()}</div>

                      <div className="quick-replies">
                        {QUICK_REPLIES.map((reply, idx) => (
                          <button
                            key={idx}
                            className="quick-reply-btn"
                            onClick={() => handleQuickReply(reply.text)}
                            disabled={isSending}
                          >
                            {reply.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {activeTab === "chat" && !loading && !error && (
            <div className="chat-input-wrapper">
              <div className="chat-input-area">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isSending}
                >
                  <IconSend color="#FFFFFF" />
                </button>
              </div>
            </div>
          )}
        </div>

        {manualVisible && (
          <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setManualVisible(false); }}>
            <div className="modal-sheet">
              <div className="modal-header">
                <span className="modal-title">PandaBot User Manual</span>
                <button className="modal-close-btn" onClick={() => setManualVisible(false)}><IconX color="#1F2933" /></button>
              </div>
              <div className="pdf-wrap">
                <iframe src={`https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(MANUAL_URL)}`} onLoad={() => setPdfLoading(false)} />
                {pdfLoading && (
                  <div className="pdf-loading">
                    <div className="spinner" />
                    <span className="pdf-loading-text">Loading manual…</span>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="action-btn btn-secondary" onClick={handleOpenManualExternal}><IconExternalLink color="#1F2933" /> Open Link</button>
                <button className="action-btn btn-primary" onClick={handleDownloadManual}><IconDownload color="#FFFFFF" /> Download</button>
              </div>
              <p className="modal-hint">If the manual doesn't display, tap "Open Link".</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HelpCenter;