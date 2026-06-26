import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Users, MessageCircle, Check } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import type { AuthUser } from "../../services/authService";
import type { Conversation } from "../../types/chat";

interface Props {
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}

const PRIMARY = "#fb8500";
const PRIMARY_LIGHT = "#FFF4E6";

const getInitials = (user: AuthUser) =>
  `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

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

const NewConversationModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { createConversation } = useChatStore();
  const { user: currentUser } = useAuth();
  const [type, setType] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(
    async (q: string) => {
      setLoading(true);
      setError("");
      try {
        const results = await userService.getUsers(q || undefined);
        setUsers(results.filter((u) => u.id !== currentUser?.id));
      } catch (e) {
        setError(
          "Failed to load users. Check the /v1/chat/users route exists.",
        );
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.id],
  );

  useEffect(() => {
    fetchUsers("");
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const toggleUser = (user: AuthUser) => {
    if (type === "direct") {
      // Toggle off if already selected, otherwise select
      setSelectedUsers((prev) =>
        prev.find((u) => u.id === user.id) ? [] : [user],
      );
      return;
    }
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  const isSelected = (user: AuthUser) =>
    selectedUsers.some((u) => u.id === user.id);

  const handleCreate = async () => {
    if (!selectedUsers.length) {
      setError("Select at least one user");
      return;
    }
    if (type === "group" && !groupName.trim()) {
      setError("Enter a group name");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const conversation = await createConversation(
        type,
        selectedUsers.map((u) => u.id),
        type === "group" ? groupName.trim() : undefined,
      );
      onCreated(conversation);
      onClose();
    } catch {
      setError("Failed to create conversation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <button onClick={onClose} style={s.closeBtn}>
            <X size={22} />
          </button>
          <span style={s.headerTitle}>New Conversation</span>
          <button
            onClick={handleCreate}
            disabled={creating || !selectedUsers.length}
            style={{
              ...s.createBtn,
              opacity: creating || !selectedUsers.length ? 0.4 : 1,
            }}
          >
            {creating ? "Creating..." : "Start"}
          </button>
        </div>

        {/* Type toggle */}
        <div style={s.typeToggle}>
          {(["direct", "group"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setSelectedUsers([]);
              }}
              style={{ ...s.typeBtn, ...(type === t ? s.typeBtnActive : {}) }}
            >
              {t === "direct" ? (
                <MessageCircle size={15} />
              ) : (
                <Users size={15} />
              )}
              {t === "direct" ? "Direct Message" : "Group Chat"}
            </button>
          ))}
        </div>

        {/* Group name input */}
        {type === "group" && (
          <div style={{ padding: "0 16px 12px" }}>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name e.g. HR Team..."
              style={s.groupInput}
            />
          </div>
        )}

        {/* Selected chips */}
        {selectedUsers.length > 0 && (
          <div style={s.chips}>
            {selectedUsers.map((u) => (
              <div key={u.id} style={s.chip}>
                <div
                  style={{
                    ...s.chipAvatar,
                    background: getAvatarColor(u.first_name),
                  }}
                >
                  {getInitials(u)}
                </div>
                <span style={s.chipName}>{u.first_name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUser(u);
                  }}
                  style={s.chipX}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={s.searchBar}>
          <Search size={16} color="#9AA5B1" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={s.searchInput}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        {/* User list */}
        <div style={s.list}>
          {loading ? (
            <div style={s.center}>
              <div style={s.spinner} />
              <span style={s.loadingText}>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div style={s.center}>
              <Users size={40} color="#CBD2D9" />
              <span style={s.loadingText}>No users found</span>
            </div>
          ) : (
            users.map((u) => {
              const selected = isSelected(u);
              const name = u.full_name ?? `${u.first_name} ${u.last_name}`;
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  style={{
                    ...s.userItem,
                    ...(selected ? s.userItemSelected : {}),
                  }}
                >
                  <div
                    style={{
                      ...s.avatar,
                      background: getAvatarColor(u.first_name),
                    }}
                  >
                    {getInitials(u)}
                  </div>
                  <div style={s.userInfo}>
                    <span style={s.userName}>{name}</span>
                    <span style={s.userEmail}>{u.email}</span>
                  </div>
                  {selected && (
                    <div style={s.check}>
                      <Check size={14} color="#fff" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "88vh",
    minHeight: "60vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 14px",
    borderBottom: "1px solid #E4E7EB",
  },
  closeBtn: {
    background: "#F5F7FA",
    border: "none",
    cursor: "pointer",
    color: "#616E7C",
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: 700, color: "#1F2933" },
  list: { overflowY: "auto", flex: 1, paddingBottom: 80 },
  createBtn: {
    background: PRIMARY,
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  typeToggle: {
    display: "flex",
    gap: 8,
    padding: "14px 16px",
    borderBottom: "1px solid #E4E7EB",
  },
  typeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
    padding: "9px 14px",
    borderRadius: 12,
    border: "1px solid #E4E7EB",
    background: "#F5F7FA",
    color: "#616E7C",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  typeBtnActive: {
    background: PRIMARY_LIGHT,
    color: PRIMARY,
    border: `1px solid ${PRIMARY}`,
    fontWeight: 600,
  },
  groupInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #E4E7EB",
    fontSize: 15,
    outline: "none",
    background: "#F5F7FA",
    boxSizing: "border-box",
    color: "#1F2933",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "10px 16px",
    borderBottom: "1px solid #E4E7EB",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: PRIMARY_LIGHT,
    borderRadius: 20,
    padding: "4px 10px 4px 4px",
    border: `1px solid ${PRIMARY}33`,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
  },
  chipName: { fontSize: 13, fontWeight: 600, color: PRIMARY },
  chipX: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: PRIMARY,
    display: "flex",
    padding: 0,
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "12px 16px",
    padding: "10px 14px",
    background: "#F5F7FA",
    borderRadius: 12,
    border: "1px solid #E4E7EB",
  },
  searchInput: {
    border: "none",
    background: "none",
    outline: "none",
    fontSize: 15,
    flex: 1,
    color: "#1F2933",
  },
  error: {
    margin: "0 16px 8px",
    padding: "10px 14px",
    background: "#FFF0F0",
    borderRadius: 10,
    color: "#FF647C",
    fontSize: 13,
  },
  // list: { overflowY: "auto", flex: 1, paddingBottom: 24 },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "48px 16px",
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #E4E7EB",
    borderTopColor: PRIMARY,
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { fontSize: 14, color: "#9AA5B1" },
  userItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #F5F7FA",
    transition: "background 0.15s",
  },
  userItemSelected: { background: PRIMARY_LIGHT },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  userInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  userName: { fontSize: 15, fontWeight: 600, color: "#1F2933" },
  userEmail: { fontSize: 13, color: "#9AA5B1" },
  check: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: PRIMARY,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};

export default NewConversationModal;
