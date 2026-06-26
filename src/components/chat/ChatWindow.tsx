import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Check,
  Users,
  X,
  UserMinus,
  UserPlus,
  Search,
  CornerDownRight,
  Paperclip,
  FileText,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { userService } from "../../services/userService";
import { chatService } from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";
import type { Conversation, Message } from "../../types/chat";
import type { AuthUser } from "../../services/authService";
import PageHeader from "../../components/PageHeader";

interface Props {
  conversation: Conversation;
  currentUserId: number;
  onBack: () => void;
}

const PRIMARY = "#fb8500";
const PRIMARY_LIGHT = "#FFF4E6";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];

function getAttachmentMeta(url: string): {
  type: "image" | "document";
  name: string;
  ext: string;
} {
  const name = url.split("/").pop() ?? "file";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return { type: IMAGE_EXTS.includes(ext) ? "image" : "document", name, ext };
}

// ── Tick component ────────────────────────────────────────────────────────────
const MessageTicks: React.FC<{
  message: Message;
  currentUserId: number;
  otherMemberIds: number[];
}> = ({ message, currentUserId, otherMemberIds }) => {
  const readBy = message.read_by ?? [];
  const othersWhoRead = readBy.filter((id) => id !== currentUserId);

  let status: "sent" | "delivered" | "read" = "sent";
  if (othersWhoRead.length > 0) {
    status =
      othersWhoRead.length >= otherMemberIds.length ? "read" : "delivered";
  }

  const tickColor = status === "read" ? PRIMARY : "#9AA5B1";

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", marginLeft: 4 }}
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

// ── Attachment renderer ───────────────────────────────────────────────────────
const AttachmentBubble: React.FC<{
  url: string;
  isMe: boolean;
  compact?: boolean;
}> = ({ url, isMe, compact = false }) => {
  const meta = getAttachmentMeta(url);

  if (meta.type === "image") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block" }}
      >
        <img
          src={url}
          alt="attachment"
          style={{
            maxWidth: compact ? 120 : 220,
            maxHeight: compact ? 80 : 200,
            borderRadius: compact ? 6 : 10,
            display: "block",
            objectFit: "cover",
          }}
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? "6px 8px" : "10px 12px",
        backgroundColor: isMe ? "rgba(0,0,0,0.15)" : "#F0F4F8",
        borderRadius: 10,
        textDecoration: "none",
        maxWidth: compact ? 180 : 240,
      }}
    >
      <FileText size={compact ? 16 : 20} color={isMe ? "#fff" : PRIMARY} />
      <span
        style={{
          flex: 1,
          fontSize: compact ? 11 : 13,
          color: isMe ? "#fff" : "#1F2933",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {meta.name}
      </span>
      <Download size={compact ? 13 : 16} color={isMe ? "#fff" : "#9AA5B1"} />
    </a>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ChatWindow: React.FC<Props> = ({
  conversation,
  currentUserId,
  onBack,
}) => {
  const {
    messages,
    loading,
    setActiveConversation,
    clearActiveConversation,
    sendMessage,
    sendTyping,
    typingUsers,
    addGroupMember,
    removeGroupMember,
    fetchConversations,
    activeConversation: storeActiveConversation,
  } = useChatStore();

  const { user: currentUser } = useAuth();
  const conv = storeActiveConversation || conversation;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingMember, setAddingMember] = useState<number | null>(null);
  const [removingMember, setRemovingMember] = useState<number | null>(null);
  const [modalError, setModalError] = useState("");

  // ── Reply state ──
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // ── Attachment state ──
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(
    null,
  );
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Refs ──
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isUserScrollingRef = useRef(false);

  const isMember = conv.members.some((m) => m.id === currentUserId);
  const isCreator = conv.created_by === currentUserId;
  const otherMemberIds = conv.members
    .map((m) => m.id)
    .filter((id) => id !== currentUserId);

  const displayName =
    conv.type === "group"
      ? (conv.name ?? "Group")
      : (() => {
          const m = conv.members.find((m) => m.id !== currentUserId);
          return m ? (m.name ?? "Unknown") : "Unknown";
        })();

  // ── Lifecycle ──
  useEffect(() => {
    setActiveConversation(conversation);
    return () => {
      clearActiveConversation();
    };
  }, [conversation.id]);

  useEffect(() => {
    if (!isUserScrollingRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Member search ──
  const fetchUsers = useCallback(
    async (query: string) => {
      setSearching(true);
      setModalError("");
      try {
        const results = await userService.getUsers(query || undefined);
        const existingIds = conv.members.map((m) => m.id);
        setSearchResults(
          results.filter(
            (u) => u.id !== currentUserId && !existingIds.includes(u.id),
          ),
        );
      } catch {
        setModalError("Failed to load users");
      } finally {
        setSearching(false);
      }
    },
    [conv.members, currentUserId],
  );

  useEffect(() => {
    if (showMemberModal) {
      setMemberSearch("");
      fetchUsers("");
    }
  }, [showMemberModal, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showMemberModal) fetchUsers(memberSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch, fetchUsers, showMemberModal]);

  // ── File picker ──
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentError("");
    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
    e.target.value = "";
  };

  const handleCancelAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setAttachmentError("");
  };

  // ── Send ──
  const handleSend = async () => {
    if (!isMember) return;
    const body = input.trim();
    const hasBody = body.length > 0;
    const hasFile = !!attachmentFile;
    if (!hasBody && !hasFile) return;
    if (sending || attachmentUploading) return;

    setSending(true);
    const replyTarget = replyToMessage;
    setReplyToMessage(null);
    setInput("");

    try {
      let attachmentUrl: string | undefined;

      if (hasFile) {
        setAttachmentUploading(true);
        try {
          const uploaded = await chatService.uploadAttachment(attachmentFile!);
          attachmentUrl = uploaded.url;
        } catch {
          setAttachmentError("Failed to upload file. Please try again.");
          setSending(false);
          setAttachmentUploading(false);
          return;
        } finally {
          setAttachmentUploading(false);
        }
        setAttachmentFile(null);
        setAttachmentPreview(null);
      }

      await sendMessage(
        body,
        replyTarget?.id,
        replyTarget ?? undefined,
        attachmentUrl ,
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isMember) return;
    if (!typingTimeoutRef.current) {
      sendTyping();
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  };

  // ── Long press to reply ──
  const handlePressStart = (msg: Message) => {
    pressTimerRef.current = setTimeout(() => {
      setReplyToMessage(msg);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleCancelReply = () => setReplyToMessage(null);

  // ── Scroll to quoted message ──
  const scrollToMessage = (messageId: number) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      isUserScrollingRef.current = true;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.style.transition = "background-color 0.3s";
      element.style.backgroundColor = PRIMARY_LIGHT;
      setTimeout(() => {
        element.style.backgroundColor = "transparent";
        isUserScrollingRef.current = false;
      }, 1500);
    }
  };

  // ── Member management ──
  const handleAddMember = async (userId: number) => {
    setAddingMember(userId);
    setModalError("");
    try {
      await addGroupMember(userId);
      await fetchConversations();
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setModalError(e.message || "Failed to add member");
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm("Remove this member?")) return;
    setRemovingMember(userId);
    setModalError("");
    try {
      await removeGroupMember(userId);
      await fetchConversations();
    } catch (e: any) {
      setModalError(e.message || "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const getMemberName = (member: any) =>
    (member.name ??
      `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()) ||
    member.email;

  const headerRightContent =
    conv.type === "group" && isMember && isCreator ? (
      <button
        onClick={() => setShowMemberModal(true)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.2)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        title="Manage Members"
      >
        <Users size={16} color="#fff" strokeWidth={2} />
      </button>
    ) : null;

  const canSend =
    (input.trim().length > 0 || !!attachmentFile) &&
    !sending &&
    !attachmentUploading;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={styles.root}>
        <PageHeader
          title={displayName}
          onBack={onBack}
          rightContent={headerRightContent}
        />

        {/* ─── Messages ─── */}
        <div style={styles.messageList}>
          {loading && (
            <div style={styles.center}>
              <div style={styles.spinner} />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div style={styles.center}>
              <span style={styles.emptyText}>
                No messages yet. Say hello 👋
              </span>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;

            let replyTarget: Message | undefined;
            if (msg.reply_to) {
              replyTarget = msg.reply_to;
            } else if (msg.reply_to_id) {
              replyTarget = messages.find((m) => m.id === msg.reply_to_id);
            }

            const hasAttachment = !!msg.attachment;
            const hasBody = !!msg.body;

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                  else messageRefs.current.delete(msg.id);
                }}
                style={{
                  ...styles.msgRow,
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
              >
                {!isMe && (
                  <div style={styles.senderAvatar}>
                    {msg.sender?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}

                <div style={{ maxWidth: "72%" }}>
                  {!isMe && (
                    <span style={styles.senderName}>
                      {msg.sender?.name ?? "Unknown"}
                    </span>
                  )}

                  {replyTarget ? (
                    <div
                      onMouseDown={() => handlePressStart(msg)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(msg)}
                      onTouchEnd={handlePressEnd}
                      style={{
                        ...styles.bubble,
                        ...(isMe ? styles.bubbleMe : styles.bubbleThem),
                        cursor: "pointer",
                        padding: 0,
                        overflow: "hidden",
                      }}
                    >
                      {/* Quoted block */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToMessage(replyTarget!.id);
                        }}
                        style={{
                          ...styles.replyPreview,
                          backgroundColor: isMe
                            ? "rgba(0,0,0,0.15)"
                            : "#F0F4F8",
                          borderLeftColor: isMe ? "#fff" : PRIMARY,
                          margin: 0,
                          borderRadius: 0,
                        }}
                      >
                        <div style={styles.replyPreviewContent}>
                          <CornerDownRight
                            size={12}
                            color={isMe ? "#fff" : PRIMARY}
                          />
                          <span
                            style={{
                              ...styles.replyPreviewName,
                              color: isMe ? "#fff" : PRIMARY,
                            }}
                          >
                            {replyTarget.sender?.name ?? "Unknown"}
                          </span>
                        </div>
                        {replyTarget.attachment ? (
                          <AttachmentBubble
                            url={replyTarget.attachment}
                            isMe={isMe}
                            compact
                          />
                        ) : (
                          <div
                            style={{
                              ...styles.replyPreviewText,
                              color: isMe ? "rgba(255,255,255,0.8)" : "#616E7C",
                            }}
                          >
                            {replyTarget.body}
                          </div>
                        )}
                      </div>

                      {/* Message content */}
                      <div
                        style={{
                          padding: "10px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {hasAttachment && (
                          <AttachmentBubble url={msg.attachment!} isMe={isMe} />
                        )}
                        {hasBody && (
                          <span
                            style={{
                              ...styles.bubbleText,
                              color: isMe ? "#fff" : "#1F2933",
                            }}
                          >
                            {msg.body}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onMouseDown={() => handlePressStart(msg)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(msg)}
                      onTouchEnd={handlePressEnd}
                      style={{
                        ...styles.bubble,
                        ...(isMe ? styles.bubbleMe : styles.bubbleThem),
                        cursor: "pointer",
                        padding: hasAttachment && !hasBody ? 4 : "10px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {hasAttachment && (
                        <AttachmentBubble url={msg.attachment!} isMe={isMe} />
                      )}
                      {hasBody && (
                        <span
                          style={{
                            ...styles.bubbleText,
                            color: isMe ? "#fff" : "#1F2933",
                          }}
                        >
                          {msg.body}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                      gap: 2,
                      marginTop: 3,
                      paddingLeft: 4,
                      paddingRight: 4,
                    }}
                  >
                    <span style={styles.msgTime}>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && (
                      <MessageTicks
                        message={msg}
                        currentUserId={currentUserId}
                        otherMemberIds={otherMemberIds}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isMember && typingUsers.length > 0 && (
            <div style={styles.typingRow}>
              <div style={styles.typingBubble}>
                <span style={styles.typingName}>
                  {typingUsers.map((u) => u.name.split(" ")[0]).join(", ")}
                  {typingUsers.length === 1 ? " is" : " are"} typing
                </span>
                <div style={styles.typingDots}>
                  <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                  <span style={{ ...styles.dot, animationDelay: "200ms" }} />
                  <span style={{ ...styles.dot, animationDelay: "400ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ─── Attachment Preview Bar ─── */}
        {attachmentFile && (
          <div style={styles.attachmentBar}>
            <div style={styles.attachmentBarInner}>
              {attachmentPreview ? (
                <img
                  src={attachmentPreview}
                  alt="preview"
                  style={styles.attachmentThumb}
                />
              ) : (
                <div style={styles.attachmentDocIcon}>
                  <FileText size={20} color={PRIMARY} />
                </div>
              )}
              <div style={styles.attachmentInfo}>
                <span style={styles.attachmentName}>{attachmentFile.name}</span>
                <span style={styles.attachmentSize}>
                  {(attachmentFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
              {attachmentUploading ? (
                <div style={styles.uploadingSpinner} />
              ) : (
                <button
                  onClick={handleCancelAttachment}
                  style={styles.attachmentCancel}
                >
                  <X size={16} color="#9AA5B1" />
                </button>
              )}
            </div>
            {attachmentError && (
              <div style={styles.attachmentErrorText}>{attachmentError}</div>
            )}
          </div>
        )}

        {/* ─── Reply Preview Bar ─── */}
        {replyToMessage && (
          <div style={styles.replyBar}>
            <div style={styles.replyContent}>
              <div style={styles.replyHeader}>
                <span style={styles.replyName}>
                  Replying to {replyToMessage.sender?.name ?? "Unknown"}
                </span>
                <button onClick={handleCancelReply} style={styles.replyClose}>
                  <X size={16} color="#9AA5B1" />
                </button>
              </div>
              {replyToMessage.attachment ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {getAttachmentMeta(replyToMessage.attachment).type ===
                  "image" ? (
                    <ImageIcon size={14} color={PRIMARY} />
                  ) : (
                    <FileText size={14} color={PRIMARY} />
                  )}
                  <span style={styles.replyBody}>
                    {getAttachmentMeta(replyToMessage.attachment).name}
                  </span>
                </div>
              ) : (
                <div style={styles.replyBody}>{replyToMessage.body}</div>
              )}
            </div>
          </div>
        )}

        {/* ─── Input Bar ─── */}
        <div style={styles.inputBar}>
          {isMember ? (
            <>
              <button
                onClick={handleAttachClick}
                disabled={attachmentUploading}
                style={{
                  ...styles.attachBtn,
                  opacity: attachmentUploading ? 0.4 : 1,
                }}
                title="Attach file"
              >
                <Paperclip size={20} color="#9AA5B1" />
              </button>

              <input
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  attachmentFile ? "Add a caption..." : "Type a message..."
                }
                style={styles.input}
                autoFocus
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{ ...styles.sendBtn, opacity: canSend ? 1 : 0.4 }}
              >
                {attachmentUploading ? (
                  <div style={styles.sendSpinner} />
                ) : (
                  <Send size={18} color="#fff" />
                )}
              </button>
            </>
          ) : (
            <div style={styles.disabledInput}>
              You have been removed from this group
            </div>
          )}
        </div>

        {/* ─── Member Management Modal ─── */}
        {showMemberModal && isMember && isCreator && (
          <div
            style={styles.modalOverlay}
            onClick={() => setShowMemberModal(false)}
          >
            <div
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>Manage Members</span>
                <button
                  onClick={() => setShowMemberModal(false)}
                  style={styles.closeModalBtn}
                >
                  <X size={18} />
                </button>
              </div>

              {modalError && <div style={styles.modalError}>{modalError}</div>}

              <div style={styles.memberList}>
                <div style={styles.sectionLabel}>Current Members</div>
                {conv.members.map((member) => {
                  const isSelf = member.id === currentUserId;
                  const canRemove = isCreator && !isSelf;
                  const name = getMemberName(member);
                  return (
                    <div key={member.id} style={styles.memberItem}>
                      <span style={styles.memberName}>
                        {name}
                        {isSelf && " (You)"}
                      </span>
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMember === member.id}
                          style={styles.removeBtn}
                        >
                          {removingMember === member.id ? (
                            "..."
                          ) : (
                            <UserMinus size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={styles.addSection}>
                <div style={styles.sectionLabel}>Add Member</div>
                <div style={styles.searchBar}>
                  <Search size={16} color="#9AA5B1" />
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    style={styles.searchInput}
                  />
                </div>
                {searching && (
                  <div style={styles.searchingText}>Searching...</div>
                )}
                <div style={styles.searchResults}>
                  {searchResults.map((u) => {
                    const name =
                      u.full_name ?? `${u.first_name} ${u.last_name}`;
                    return (
                      <div key={u.id} style={styles.searchResultItem}>
                        <span style={styles.resultName}>{name}</span>
                        <span style={styles.resultEmail}>{u.email}</span>
                        <button
                          onClick={() => handleAddMember(u.id)}
                          disabled={addingMember === u.id}
                          style={styles.addResultBtn}
                        >
                          {addingMember === u.id ? (
                            "..."
                          ) : (
                            <UserPlus size={14} />
                          )}{" "}
                          Add
                        </button>
                      </div>
                    );
                  })}
                  {!searching && memberSearch && searchResults.length === 0 && (
                    <div style={styles.noResults}>No users found</div>
                  )}
                </div>
              </div>

              <div style={styles.modalNote}>
                * Only the group creator can remove members.
                <br />* You can add any user from the system.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    backgroundColor: "#F5F7FA",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 1000,
    boxSizing: "border-box",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #E4E7EB",
    borderTopColor: PRIMARY,
    animation: "spin 0.8s linear infinite",
  },
  emptyText: { color: "#9AA5B1", fontSize: 14 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#96CEB4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  senderName: {
    fontSize: 11,
    color: "#9AA5B1",
    marginBottom: 3,
    display: "block",
    paddingLeft: 4,
  },
  bubble: { padding: "10px 14px", borderRadius: 18, wordBreak: "break-word" },
  bubbleMe: { background: PRIMARY, borderBottomRightRadius: 4 },
  bubbleThem: {
    background: "#fff",
    borderBottomLeftRadius: 4,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  bubbleText: { fontSize: 15, lineHeight: 1.4 },
  msgTime: { fontSize: 11, color: "#9AA5B1" },
  typingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
  typingBubble: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: "8px 14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  typingName: { fontSize: 12, color: "#9AA5B1", fontStyle: "italic" },
  typingDots: { display: "flex", alignItems: "center", gap: 3 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#9AA5B1",
    display: "inline-block",
    animation: "dotBounce 1.2s infinite ease-in-out",
  },
  replyPreview: {
    cursor: "pointer",
    padding: "8px 12px",
    borderLeft: `3px solid ${PRIMARY}`,
    transition: "background-color 0.2s",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  replyPreviewContent: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  replyPreviewName: { fontSize: 12, fontWeight: 600, color: PRIMARY },
  replyPreviewText: {
    fontSize: 13,
    color: "#616E7C",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  attachmentBar: {
    backgroundColor: "#fff",
    borderTop: "1px solid #E4E7EB",
    padding: "10px 16px",
    flexShrink: 0,
  },
  attachmentBarInner: { display: "flex", alignItems: "center", gap: 10 },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  attachmentDocIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  attachmentInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    overflow: "hidden",
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1F2933",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  attachmentSize: { fontSize: 11, color: "#9AA5B1" },
  attachmentCancel: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentErrorText: { fontSize: 12, color: "#FF647C", marginTop: 6 },
  uploadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "2px solid #E4E7EB",
    borderTopColor: PRIMARY,
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  replyBar: {
    backgroundColor: "#fff",
    borderTop: "1px solid #E4E7EB",
    borderBottom: "1px solid #E4E7EB",
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  replyContent: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  replyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  replyName: { fontSize: 12, fontWeight: 600, color: PRIMARY },
  replyClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  replyBody: {
    fontSize: 13,
    color: "#616E7C",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    borderLeft: `3px solid ${PRIMARY}`,
    paddingLeft: 8,
  },
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    background: "#F5F7FA",
    borderTop: "1px solid #E4E7EB",
    flexShrink: 0,
    marginBottom: 80,
  },
  attachBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 24,
    border: "1px solid #E4E7EB",
    fontSize: 15,
    outline: "none",
    background: "#F5F7FA",
    color: "#1F2933",
  },
  disabledInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 24,
    background: "#E4E7EB",
    color: "#FF647C",
    fontSize: 14,
    textAlign: "center",
    fontWeight: 500,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: PRIMARY,
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  sendSpinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    animation: "spin 0.8s linear infinite",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 420,
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 600, color: "#1F2933" },
  closeModalBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    color: "#9AA5B1",
  },
  modalError: {
    padding: 8,
    background: "#FFF0F0",
    color: "#FF647C",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#616E7C",
    marginBottom: 8,
    marginTop: 8,
  },
  memberList: { marginBottom: 16 },
  memberItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #F5F7FA",
  },
  memberName: { fontSize: 14, color: "#1F2933" },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#FF647C",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addSection: { marginTop: 8 },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    background: "#F5F7FA",
    borderRadius: 10,
    border: "1px solid #E4E7EB",
    marginBottom: 8,
  },
  searchInput: {
    border: "none",
    background: "none",
    outline: "none",
    fontSize: 14,
    flex: 1,
    color: "#1F2933",
  },
  searchingText: { fontSize: 12, color: "#9AA5B1", marginBottom: 4 },
  searchResults: { maxHeight: 200, overflowY: "auto" },
  searchResultItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 0",
    borderBottom: "1px solid #F5F7FA",
  },
  resultName: { fontSize: 14, fontWeight: 500, color: "#1F2933", flex: 1 },
  resultEmail: { fontSize: 12, color: "#9AA5B1", flex: 1 },
  addResultBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 12px",
    background: PRIMARY,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },
  noResults: {
    padding: "12px 0",
    textAlign: "center",
    color: "#9AA5B1",
    fontSize: 13,
  },
  modalNote: { fontSize: 12, color: "#9AA5B1", marginTop: 12, lineHeight: 1.4 },
};

export default ChatWindow;
