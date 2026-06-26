import React from "react";
import { Conversation } from "../../types/chat";

interface Props {
  conversation: Conversation;
  onClick: (conversation: Conversation) => void;
  currentUserId: number;
}

const ChatListItem: React.FC<Props> = ({
  conversation,
  onClick,
  currentUserId,
}) => {
    const displayName =
      conversation.type === "group"
        ? (conversation.name ?? "Group")
        : (() => {
            const m = conversation.members.find((m) => m.id !== currentUserId);
            if (!m) return "Unknown";
            return (
              (m.name ?? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()) ||
              "Unknown"
            );
          })();
    
  const initials = displayName?.charAt(0).toUpperCase() ?? "?";
  const preview = conversation.latest_message?.body ?? "No messages yet";
  const time = conversation.latest_message
    ? new Date(conversation.latest_message.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className="chat-item"
      onClick={() => onClick(conversation)}
      style={{ cursor: "pointer" }}
    >
      <div className="chat-avatar-wrap">
        <div className="avatar avatar-md">{initials}</div>
      </div>
      <div className="chat-info">
        <div className="chat-info-top">
          <span className="chat-name">{displayName}</span>
          <span className="chat-time">{time}</span>
        </div>
        <p className="chat-preview">{preview}</p>
      </div>
      {(conversation.unread_count ?? 0) > 0 && (
        <div className="chat-unread">{conversation.unread_count}</div>
      )}
    </div>
  );
};

export default ChatListItem;
