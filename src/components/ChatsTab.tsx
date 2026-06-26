import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, MessageCircle, Users, Check } from "lucide-react";
import { useChatStore } from "../stores/chatStore";
import type { Conversation, Message } from "../types/chat";
import NewConversationModal from "./chat/NewConversationModal";
import MessagesHeader from "./chat/MessageHeader";

interface Props {
  currentUserId: number;
  onOpenChat: (conversation: Conversation) => void;
  onBack?: () => void;
}

type FilterTab = "all" | "direct" | "group";

const PRIMARY = "#fb8500";

const getInitials = (name: string) => {
  const words = name.trim().split(" ").filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#DDA0DD",
    "#98D8C8",
    "#BB8FCE",
    "#85C1E9",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000)
    return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// ── Tick component (mirrors ChatWindow) ─────────────────────────────────
const MessageTicks: React.FC<{
  message: Message;
  currentUserId: number;
  otherMemberCount: number;
}> = ({ message, currentUserId, otherMemberCount }) => {
  const readBy = message.read_by ?? [];
  const othersWhoRead = readBy.filter((id) => id !== currentUserId);

  let status: "sent" | "delivered" | "read" = "sent";
  if (othersWhoRead.length > 0) {
    status = othersWhoRead.length >= otherMemberCount ? "read" : "delivered";
  }

  const tickColor = status === "read" ? PRIMARY : "#9AA5B1";

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", marginRight: 4 }}
    >
      <Check size={13} color={tickColor} strokeWidth={2.5} />
      {status !== "sent" && (
        <Check
          size={13}
          color={tickColor}
          strokeWidth={2.5}
          style={{ marginLeft: -7 }}
        />
      )}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ChatsTab: React.FC<Props> = ({ currentUserId, onOpenChat, onBack }) => {
  const {
    conversations,
    loading,
    error,
    startPolling,
    stopPolling,
    typingUsers, // <-- from store
    activeConversation, // <-- from store
  } = useChatStore();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  const getDisplayName = useCallback(
    (c: Conversation) => {
      if (c.type === "group") return c.name ?? "Group";
      const m = c.members.find((m) => m.id !== currentUserId);
      if (!m) return "Unknown";
      return (
        (m.name ?? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()) ||
        "Unknown"
      );
    },
    [currentUserId],
  );

  const unreadCounts = {
    all: conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0),
    direct: conversations
      .filter((c) => c.type === "direct")
      .reduce((s, c) => s + (c.unread_count ?? 0), 0),
    group: conversations
      .filter((c) => c.type === "group")
      .reduce((s, c) => s + (c.unread_count ?? 0), 0),
  };

  const filtered = conversations
    .filter((c) => activeFilter === "all" || c.type === activeFilter)
    .filter((c) =>
      getDisplayName(c).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const aT = a.latest_message
        ? new Date(a.latest_message.created_at).getTime()
        : 0;
      const bT = b.latest_message
        ? new Date(b.latest_message.created_at).getTime()
        : 0;
      return bT - aT;
    });

  const filters: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <MessageCircle size={14} /> },
    { key: "direct", label: "Direct", icon: <MessageCircle size={14} /> },
    { key: "group", label: "Groups", icon: <Users size={14} /> },
  ];

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={styles.container}>
        {/* ─── Fixed Header ─── */}
        <div style={styles.fixedHeader}>
          <MessagesHeader
            onPlusClick={() => setShowModal(true)}
            onBack={onBack}
          />
        </div>

        {/* ─── Scrollable Content ─── */}
        <div style={{ ...styles.scrollArea, paddingTop: 25 }}>
          {/* Search */}
          <div style={styles.searchWrap}>
            <div style={styles.searchBar}>
              <Search size={16} color="#9AA5B1" />
              <input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div style={styles.filterRow}>
            {filters.map((f) => {
              const active = activeFilter === f.key;
              const count = unreadCounts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    ...styles.filterTab,
                    ...(active ? styles.filterTabActive : {}),
                  }}
                >
                  <span
                    style={{
                      color: active ? "#fff" : "#9AA5B1",
                      display: "flex",
                    }}
                  >
                    {f.icon}
                  </span>
                  {f.label}
                  {count > 0 && (
                    <span
                      style={{
                        ...styles.filterBadge,
                        ...(active ? styles.filterBadgeActive : {}),
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Conversation list */}
          <div style={styles.list}>
            {loading && (
              <div style={styles.center}>
                <div style={styles.spinner} />
              </div>
            )}
            {error && <div style={styles.errorMsg}>{error}</div>}
            {!loading && filtered.length === 0 && (
              <div style={styles.emptyState}>
                <MessageCircle size={56} color="#CBD2D9" strokeWidth={1.5} />
                <p style={styles.emptyTitle}>No conversations yet</p>
                <p style={styles.emptySubtitle}>
                  Start a new chat to connect with others
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  style={styles.emptyBtn}
                >
                  <Plus size={18} color="#fff" /> New Chat
                </button>
              </div>
            )}

            {filtered.map((c) => {
              const name = getDisplayName(c);
              const latestMsg = c.latest_message;
              const preview = latestMsg?.body ?? "No messages yet";
              const time = latestMsg ? formatTime(latestMsg.created_at) : "";
              const unread = c.unread_count ?? 0;
              const isGroup = c.type === "group";
              const isMine = latestMsg?.sender_id === currentUserId;
              const otherMemberCount = c.members.filter(
                (m) => m.id !== currentUserId,
              ).length;

              // Check if this conversation is the active one and has typing users
              const isTypingHere =
                activeConversation?.id === c.id && typingUsers.length > 0;

              return (
                <div
                  key={c.id}
                  onClick={() => onOpenChat(c)}
                  style={styles.item}
                >
                  <div style={styles.avatarWrap}>
                    <div
                      style={{
                        ...styles.avatar,
                        background: getAvatarColor(name),
                      }}
                    >
                      {getInitials(name)}
                    </div>
                    {isGroup && (
                      <div style={styles.typeIcon}>
                        <Users size={10} color="#fff" />
                      </div>
                    )}
                  </div>

                  <div style={styles.itemContent}>
                    <div style={styles.itemTop}>
                      <span
                        style={{
                          ...styles.itemName,
                          ...(unread > 0 ? styles.itemNameUnread : {}),
                        }}
                      >
                        {name}
                      </span>
                      <div style={styles.itemMeta}>
                        {isMine && latestMsg && (
                          <MessageTicks
                            message={latestMsg}
                            currentUserId={currentUserId}
                            otherMemberCount={otherMemberCount}
                          />
                        )}
                        <span style={styles.itemTime}>{time}</span>
                      </div>
                    </div>

                    <div style={styles.itemBottom}>
                      <span
                        style={{
                          ...styles.itemPreview,
                          ...(unread > 0 && !isTypingHere
                            ? styles.itemPreviewUnread
                            : {}),
                          ...(isTypingHere
                            ? { color: PRIMARY, fontStyle: "italic" }
                            : {}),
                        }}
                      >
                        {isTypingHere
                          ? `${typingUsers
                              .map((u) => u.name.split(" ")[0])
                              .join(", ")} typing...`
                          : preview}
                      </span>
                      {unread > 0 && (
                        <span style={styles.badge}>
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── New Conversation Modal ─── */}
        {showModal && (
          <NewConversationModal
            onClose={() => setShowModal(false)}
            onCreated={(conv) => onOpenChat(conv)}
          />
        )}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    height: "100%",
    background: "#F5F7FA",
    overflow: "hidden",
  },
  fixedHeader: {
    position: "fixed",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    zIndex: 10,
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 16,
  },
  searchWrap: { padding: "14px 16px 0" },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    borderRadius: 14,
    padding: "10px 14px",
    border: "1px solid #E4E7EB",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: 15,
    flex: 1,
    background: "none",
    color: "#1F2933",
  },
  filterRow: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    overflowX: "auto",
    flexShrink: 0,
  },
  filterTab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 16px",
    borderRadius: 20,
    border: "1px solid #E4E7EB",
    background: "#fff",
    color: "#9AA5B1",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  filterTabActive: {
    background: PRIMARY,
    color: "#fff",
    border: `1px solid ${PRIMARY}`,
  },
  filterBadge: {
    background: "#FF647C",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 10,
    padding: "1px 6px",
    marginLeft: 2,
  },
  filterBadgeActive: { background: "#fff", color: PRIMARY },
  list: { padding: "0 0 80px" },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #E4E7EB",
    borderTopColor: PRIMARY,
    animation: "spin 0.8s linear infinite",
  },
  errorMsg: {
    margin: 16,
    padding: 14,
    background: "#FFF0F0",
    borderRadius: 12,
    color: "#FF647C",
    fontSize: 14,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 32px",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#1F2933",
    margin: "8px 0 4px",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9AA5B1",
    textAlign: "center",
    margin: "0 0 16px",
  },
  emptyBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: PRIMARY,
    color: "#fff",
    border: "none",
    borderRadius: 24,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "#fff",
    borderBottom: "1px solid #F5F7FA",
    cursor: "pointer",
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
  },
  typeIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: PRIMARY,
    border: "2px solid #fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: { flex: 1, minWidth: 0 },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 500,
    color: "#1F2933",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemNameUnread: { fontWeight: 700 },
  itemMeta: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: 8,
  },
  itemTime: { fontSize: 12, color: "#9AA5B1" },
  itemBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemPreview: {
    fontSize: 13,
    color: "#9AA5B1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  itemPreviewUnread: { color: "#1F2933", fontWeight: 500 },
  badge: {
    background: PRIMARY,
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    padding: "2px 7px",
    marginLeft: 8,
    flexShrink: 0,
  },
};

export default ChatsTab;
