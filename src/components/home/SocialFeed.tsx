import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Plus,
  RefreshCw,
  AlertCircle,
  Pin,
  PinOff,
  Image as ImageIcon,
  X,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useFeed } from "../../hooks/useFeed";
import { useAuth } from "../../context/AuthContext";
import type { FeedComment } from "../../services/FeedService";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIN_ADMIN_EMAILS = [
  "mmathabo@skillspanda.co.za",
  "heita@skillspanda.co.za",
];
const MAX_MEDIA = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STORAGE_BASE_URL =
  (import.meta as any).env.VITE_STORAGE_BASE_URL || window.location.origin;

function getImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return STORAGE_BASE_URL + (url.startsWith("/") ? url : "/" + url);
}

// ─── Lightbox Modal ──────────────────────────────────────────────────────────

interface LightboxModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const LightboxModal: React.FC<LightboxModalProps> = ({
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goPrev, goNext]);

  if (!images.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
        cursor: "pointer",
      }}
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: 24,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        <X size={28} />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            style={{
              position: "absolute",
              left: 20,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.4)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            style={{
              position: "absolute",
              right: 20,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.4)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      <img
        src={images[currentIndex]}
        alt="lightbox"
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 4,
          cursor: "default",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#fff",
            fontSize: 14,
            background: "rgba(0,0,0,0.6)",
            padding: "4px 12px",
            borderRadius: 20,
          }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

// ─── Media Gallery ────────────────────────────────────────────────────────────

interface GalleryImage {
  src: string;
  type?: string;
}

interface PostMediaGalleryProps {
  items: GalleryImage[];
  onImageClick?: (index: number) => void;
  onRemove?: (index: number) => void;
}

const PostMediaGallery: React.FC<PostMediaGalleryProps> = ({
  items,
  onImageClick,
  onRemove,
}) => {
  const validImages = items
    .filter((item) => item?.src && item.src.trim() !== "")
    .map((item) => getImageUrl(item.src));

  if (validImages.length === 0) return null;

  const count = validImages.length;

  const imageProps = (src: string, alt: string) => ({
    src,
    alt,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      console.error("Image failed to load:", src);
      e.currentTarget.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' font-family='sans-serif' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E📷%3C/text%3E%3C/svg%3E";
      e.currentTarget.alt = "Image unavailable";
    },
  });

  const renderImageWithRemove = (
    src: string,
    alt: string,
    index: number,
    style: React.CSSProperties,
  ) => (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
        height: "100%",
      }}
    >
      <img
        {...imageProps(src, alt)}
        style={{ ...style, cursor: "pointer" }}
        onClick={() => onImageClick?.(index)}
      />
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "rgba(0,0,0,0.6)",
            border: "none",
            borderRadius: "50%",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            padding: 0,
            lineHeight: 1,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  // 1 image
  if (count === 1) {
    return (
      <div style={styles.singleContainer}>
        {renderImageWithRemove(
          validImages[0],
          "post media",
          0,
          styles.singleImage,
        )}
      </div>
    );
  }

  // 2 images
  if (count === 2) {
    return (
      <div style={styles.twoContainer}>
        {validImages.map((src, i) =>
          renderImageWithRemove(src, `media-${i}`, i, styles.twoImage),
        )}
      </div>
    );
  }

  // 3 images
  if (count === 3) {
    return (
      <div style={styles.threeContainer}>
        <div style={styles.threeMain}>
          {renderImageWithRemove(
            validImages[0],
            "main",
            0,
            styles.threeMainImage,
          )}
        </div>
        <div style={styles.threeSide}>
          {validImages
            .slice(1)
            .map((src, i) =>
              renderImageWithRemove(
                src,
                `side-${i}`,
                i + 1,
                styles.threeSideImage,
              ),
            )}
        </div>
      </div>
    );
  }

  // 4+ images – 2x2 grid with +N overlay
  const display = validImages.slice(0, 4);
  const remaining = validImages.length - 4;

  return (
    <div style={styles.gridContainer}>
      {display.map((src, i) => (
        <div key={i} style={styles.gridItem}>
          {renderImageWithRemove(src, `grid-${i}`, i, styles.gridImage)}
          {i === 3 && remaining > 0 && (
            <div style={styles.moreOverlay} onClick={() => onImageClick?.(3)}>
              <span style={styles.moreText}>+{remaining}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const styles = {
  singleContainer: { borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  singleImage: {
    width: "100%",
    height: 300,
    objectFit: "cover" as const,
    display: "block",
  },
  twoContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  twoImage: {
    width: "100%",
    height: 200,
    objectFit: "cover" as const,
    display: "block",
  },
  threeContainer: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    height: 260,
  },
  threeMain: { height: "100%" },
  threeMainImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },
  threeSide: {
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: 4,
    height: "100%",
  },
  threeSideImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  gridItem: {
    position: "relative" as const,
    aspectRatio: "1 / 1",
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },
  moreOverlay: {
    position: "absolute" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  moreText: { color: "#fff", fontSize: 24, fontWeight: 700 },
};

// ─── Comment Styles ──────────────────────────────────────────────────────────

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "var(--primary, #fb8500)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 700,
  flexShrink: 0,
};

const bubbleStyle: React.CSSProperties = {
  background: "var(--bg-secondary, #f0f0f0)",
  borderRadius: 10,
  padding: "6px 10px",
  flex: 1,
};

// ─── Single Comment Component with Nested Replies ─────────────────────────────

interface CommentWithRepliesProps {
  comment: FeedComment;
  postId: number;
  depth?: number;
  onReplyAdded: (parentId: number, reply: FeedComment) => void;
}

const CommentWithReplies: React.FC<CommentWithRepliesProps> = ({
  comment,
  postId,
  depth = 0,
  onReplyAdded,
}) => {
  const { user } = useAuth();
  const { addComment } = useFeed();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [localReplies, setLocalReplies] = useState<FeedComment[]>(
    comment.replies || [],
  );

  const first = user?.first_name ?? "";
  const last = user?.last_name ?? "";
  const authorInitials =
    ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";

  const handleReplySubmit = async () => {
    if (!replyDraft.trim()) return;
    setSubmittingReply(true);
    try {
      const reply = await addComment(postId, replyDraft.trim(), comment.id);
      if (reply) {
        setLocalReplies((prev) => [...prev, reply]);
        setReplyDraft("");
        setShowReplyInput(false);
        onReplyAdded(comment.id, reply);
      }
    } catch (error) {
      console.error("Failed to add reply:", error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const replyCount = localReplies.length;

  // Calculate indentation based on depth (max 48px)
  const indentLevel = Math.min(depth * 16, 48);

  return (
    <div style={{ marginBottom: 8, marginLeft: depth > 0 ? indentLevel : 0 }}>
      {/* Main Comment */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            ...avatarStyle,
            width: depth > 0 ? 24 : 28,
            height: depth > 0 ? 24 : 28,
            fontSize: depth > 0 ? 8 : 10,
          }}
        >
          {comment.user?.initials ?? "?"}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...bubbleStyle,
              padding: depth > 0 ? "4px 8px" : "6px 10px",
            }}
          >
            <span
              style={{
                fontSize: depth > 0 ? 11 : 12,
                fontWeight: 700,
                marginRight: 6,
              }}
            >
              {comment.user?.name ?? "Unknown"}
            </span>
            <span
              style={{
                fontSize: depth > 0 ? 10 : 11,
                color: "var(--text-muted)",
              }}
            >
              {timeAgo(comment.created_at)}
            </span>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: depth > 0 ? 12 : 13,
                wordWrap: "break-word",
              }}
            >
              {comment.content}
            </p>
          </div>

          {/* Reply Button */}
          <button
            onClick={() => setShowReplyInput((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: depth > 0 ? 10 : 11,
              cursor: "pointer",
              padding: "2px 0",
              marginTop: 2,
            }}
          >
            Reply
          </button>

          {/* Reply Input */}
          {showReplyInput && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 4,
                alignItems: "center",
              }}
            >
              <div
                style={{ ...avatarStyle, width: 24, height: 24, fontSize: 8 }}
              >
                {authorInitials}
              </div>
              <input
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReplySubmit();
                  }
                }}
                placeholder={`Reply to ${comment.user?.name ?? "Unknown"}...`}
                style={{
                  flex: 1,
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "4px 10px",
                  fontSize: 12,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                autoFocus
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyDraft.trim() || submittingReply}
                style={{
                  background: "var(--primary, #fb8500)",
                  border: "none",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: !replyDraft.trim() || submittingReply ? 0.5 : 1,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <Send size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies Toggle */}
      {replyCount > 0 && (
        <div style={{ marginLeft: depth > 0 ? 0 : 36, marginTop: 2 }}>
          <button
            onClick={() => setShowReplies((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: depth > 0 ? 10 : 11,
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            {showReplies ? "Hide" : "Show"} replies ({replyCount})
          </button>
        </div>
      )}

      {/* Nested Replies List - Recursive */}
      {showReplies && replyCount > 0 && (
        <div style={{ marginLeft: depth > 0 ? 0 : 20, marginTop: 4 }}>
          {localReplies.map((reply) => (
            <CommentWithReplies
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Comment Thread ────────────────────────────────────────────────────────────

interface CommentThreadProps {
  postId: number;
  commentCount: number;
  open: boolean;
  onToggle: () => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  commentCount,
  open,
  onToggle,
}) => {
  const { user } = useAuth();
  const { fetchComments, addComment } = useFeed();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pagination state for comments
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load comments with pagination
  const loadComments = useCallback(
    async (page = 1, append = false) => {
      if (loading || loadingMore) return;

      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await fetchComments(postId, page, 10);

        let commentsData: FeedComment[] = [];
        let metaData = {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
        };

        if (result && typeof result === "object") {
          if ("data" in result && Array.isArray(result.data)) {
            commentsData = result.data;
            if ("meta" in result && result.meta) {
              metaData = result.meta;
            }
          } else if (Array.isArray(result)) {
            commentsData = result;
          }
        }

        if (append) {
          setComments((prev) => [...prev, ...commentsData]);
        } else {
          setComments(commentsData);
        }

        setCurrentPage(metaData.current_page);
        setHasMore(metaData.current_page < metaData.last_page);
        setTotalComments(metaData.total);
      } catch (error) {
        console.error("Failed to load comments:", error);
        setComments([]);
        setHasMore(false);
        setTotalComments(0);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, fetchComments, loading, loadingMore],
  );

  // Load first page when comments are opened
  useEffect(() => {
    if (open && comments.length === 0 && !loading) {
      loadComments(1, false);
    }
  }, [open, loadComments, comments.length, loading]);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addComment(postId, draft.trim());
      if (comment) {
        setComments((prev) => [comment, ...prev]);
        setTotalComments((prev) => prev + 1);
        setDraft("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyAdded = useCallback(
    (parentId: number, reply: FeedComment) => {
      // Recursively find and update the comment with the new reply
      const updateReplies = (items: FeedComment[]): FeedComment[] => {
        return items.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), reply],
            };
          }
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: updateReplies(c.replies),
            };
          }
          return c;
        });
      };

      setComments((prev) => updateReplies(prev));
    },
    [],
  );

  const loadMoreComments = () => {
    if (!loadingMore && hasMore) {
      loadComments(currentPage + 1, true);
    }
  };

  const first = user?.first_name ?? "";
  const last = user?.last_name ?? "";
  const authorInitials =
    ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";

  return (
    <div
      style={{
        // borderTop: "1px solid var(--border)",
        marginTop: 0,
        paddingTop: 0,
      }}
    >
      {/* <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 0",
        }}
      >
        <MessageCircle size={14} />
        {open ? "Hide" : "Show"} comments ({totalComments || commentCount})
      </button> */}

      {open && (
        <div
          style={{
            marginTop: 8,
            maxHeight: 400,
            overflowY: "auto",
            paddingRight: 4,
          }}
          className="comments-scroll-container"
        >
          {/* Loading state */}
          {loading && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: "4px 0",
              }}
            >
              Loading comments…
            </p>
          )}

          {/* Empty state */}
          {!loading && comments.length === 0 && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: "4px 0 8px",
              }}
            >
              No comments yet. Be the first!
            </p>
          )}

          {/* Comments list */}
          {comments.map((c) => (
            <CommentWithReplies
              key={c.id}
              comment={c}
              postId={postId}
              depth={0}
              onReplyAdded={handleReplyAdded}
            />
          ))}

          {/* Load more comments button */}
          {hasMore && !loading && (
            <button
              onClick={loadMoreComments}
              disabled={loadingMore}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary, #fb8500)",
                fontSize: 12,
                cursor: loadingMore ? "default" : "pointer",
                padding: "8px 0",
                opacity: loadingMore ? 0.5 : 1,
                display: "block",
                width: "100%",
                textAlign: "center",
              }}
            >
              {loadingMore ? "Loading more comments..." : "Load more comments"}
            </button>
          )}

          {/* Comment input - always at the bottom */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              position: "sticky",
              bottom: 0,
              background: "var(--bg)",
              paddingBottom: 4,
            }}
          >
            <div style={avatarStyle}>{authorInitials}</div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Write a comment…"
              style={{
                flex: 1,
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
              style={{
                background: "var(--primary, #fb8500)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: !draft.trim() || submitting ? 0.5 : 1,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SocialFeed Main Component ───────────────────────────────────────────────

const SocialFeed: React.FC = () => {
  const { user } = useAuth();
  const {
    posts,
    isLoading,
    isRefreshing,
    error,
    load,
    refresh,
    loadMore,
    toggleLike,
    togglePin,
    createPost,
    deletePost,
    hasMore,
  } = useFeed();

  const [showCompose, setShowCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<
    Array<{ src: string; type: string }>
  >([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openComments, setOpenComments] = useState<Set<number>>(new Set());

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Infinite scroll ────────────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          !isRefreshing
        ) {
          loadMore();
        }
      },
      { rootMargin: "0px 0px 100px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isRefreshing, loadMore]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const isAdmin = PIN_ADMIN_EMAILS.includes(user?.email ?? "");

  const authorFirst = user?.first_name ?? "";
  const authorLast = user?.last_name ?? "";
  const authorName =
    [authorFirst, authorLast].filter(Boolean).join(" ") || user?.email || "You";
  const authorInitials =
    ((authorFirst[0] ?? "") + (authorLast[0] ?? "")).toUpperCase() || "?";

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_MEDIA - mediaFiles.length;
    const toAdd = files.slice(0, remaining);

    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaPreviews((prev) => [
          ...prev,
          {
            src: ev.target?.result as string,
            type: file.type.startsWith("video/") ? "video" : "image",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    setMediaFiles((prev) => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = useCallback(async () => {
    if (!draft.trim() && mediaFiles.length === 0) return;
    setPosting(true);
    const ok = await createPost(
      draft.trim(),
      mediaFiles.length > 0 ? mediaFiles : undefined,
    );
    if (ok) {
      setDraft("");
      setMediaPreviews([]);
      setMediaFiles([]);
      setShowCompose(false);
    }
    setPosting(false);
  }, [draft, mediaFiles, createPost]);

  const cancelCompose = () => {
    setShowCompose(false);
    setDraft("");
    setMediaPreviews([]);
    setMediaFiles([]);
  };

  const toggleComments = (postId: number) => {
    setOpenComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await deletePost(postId);
  };

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.is_pinned === b.is_pinned) return 0;
    return a.is_pinned ? -1 : 1;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-section">
      {/* Header */}
      <div className="section-header">
        <span className="section-title">Community feed</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              opacity: isRefreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
            onClick={() => setShowCompose((v) => !v)}
          >
            <Plus size={13} /> Post
          </button>
        </div>
      </div>

      {/* Compose box */}
      {showCompose && (
        <div className="card" style={{ marginBottom: 12, padding: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--primary, #fb8500)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {authorInitials}
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {authorName}
            </span>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              background: "var(--bg)",
              color: "var(--text-primary)",
              resize: "none",
              boxSizing: "border-box",
            }}
          />

          {mediaPreviews.length > 0 && (
            <PostMediaGallery
              items={mediaPreviews}
              onRemove={removeMedia}
              onImageClick={(index) => {
                const urls = mediaPreviews.map((item) => item.src);
                openLightbox(urls, index);
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= MAX_MEDIA}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "5px 10px",
                background: "none",
                cursor:
                  mediaFiles.length >= MAX_MEDIA ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: "var(--text-secondary)",
                opacity: mediaFiles.length >= MAX_MEDIA ? 0.4 : 1,
              }}
            >
              <ImageIcon size={14} />
              Photo/Video
              {mediaFiles.length > 0
                ? ` (${mediaFiles.length}/${MAX_MEDIA})`
                : ""}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={handleMediaSelect}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                style={{ fontSize: 13 }}
                onClick={cancelCompose}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ fontSize: 13 }}
                disabled={(!draft.trim() && mediaFiles.length === 0) || posting}
                onClick={handlePost}
              >
                {posting ? "Posting…" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#EF4444",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Skeletons */}
      {isLoading && posts.length === 0 && (
        <>
          {[1, 2, 3].map((i) => (
            <div
              className="post-card"
              key={`skeleton-${i}`}
              style={{ opacity: 0.4 }}
            >
              <div className="post-header">
                <div
                  className="avatar avatar-md"
                  style={{ background: "var(--border)" }}
                />
              </div>
              <div className="post-meta">
                <div
                  style={{
                    height: 12,
                    width: 120,
                    background: "var(--border)",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div
                style={{
                  height: 12,
                  background: "var(--border)",
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              />
            </div>
          ))}
        </>
      )}

      {/* Posts */}
      {sortedPosts.map((post, index) => {
        const isCommentsOpen = openComments.has(post.id);
        const isAuthor = user?.id === post.user?.id;
        const canDelete = isAuthor || isAdmin;

        const validMedia =
          post.media?.filter((m) => m.url && m.url.trim() !== "") ?? [];
        const resolvedImages = validMedia.map((m) => getImageUrl(m.url));

        return (
          <div
            className="post-card"
            key={post.id ?? `post-${index}`}
            style={
              post.is_pinned
                ? { border: "1.5px solid #fb8500", position: "relative" }
                : { position: "relative" }
            }
          >
            {post.is_pinned && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "#fb8500",
                  fontWeight: 600,
                }}
              >
                <Pin size={11} /> Pinned
              </div>
            )}

            <div className="post-header">
              <div className="avatar avatar-md">
                {post.user?.initials ?? "?"}
              </div>
              <div className="post-meta">
                <h4>{post.user?.name ?? "Unknown user"}</h4>
                <span>
                  {post.user?.role ?? "Learner"} · {timeAgo(post.created_at)}
                </span>
              </div>
            </div>

            {post.content && <p className="post-body">{post.content}</p>}

            {post.media?.length > 0 && (
              <PostMediaGallery
                items={post.media.map((m) => ({
                  src: m.url,
                  type: m.type,
                }))}
                onImageClick={(index) => {
                  if (resolvedImages.length > 0) {
                    openLightbox(resolvedImages, index);
                  }
                }}
              />
            )}

            <div
              className="post-actions"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <button
                className={`post-action-btn ${post.liked_by_me ? "liked" : ""}`}
                onClick={() => toggleLike(post.id)}
              >
                <Heart size={15} fill={post.liked_by_me ? "#EF4444" : "none"} />{" "}
                {post.likes_count}
              </button>
              <button
                className="post-action-btn"
                onClick={() => toggleComments(post.id)}
              >
                <MessageCircle size={15} /> {post.comments_count}
              </button>

              {canDelete && (
                <button
                  className="post-action-btn"
                  onClick={() => handleDeletePost(post.id)}
                  title="Delete post"
                  style={{ color: "#EF4444", marginLeft: "auto" }}
                >
                  <Trash2 size={15} />
                </button>
              )}

              {isAdmin && (
                <button
                  className="post-action-btn"
                  onClick={() => togglePin(post.id, post.is_pinned)}
                  title={post.is_pinned ? "Unpin post" : "Pin post"}
                  style={{
                    color: post.is_pinned ? "#fb8500" : undefined,
                  }}
                >
                  {post.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
                </button>
              )}
            </div>

            <CommentThread
              postId={post.id}
              commentCount={post.comments_count}
              open={isCommentsOpen}
              onToggle={() => toggleComments(post.id)}
            />
          </div>
        );
      })}

      {/* Infinite scroll indicators */}
      {isLoading && posts.length > 0 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <RefreshCw
            size={20}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Loading more…
          </p>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-muted)",
            padding: "10px 0",
          }}
        >
          You've seen all posts
        </p>
      )}

      {hasMore && (
        <div
          ref={sentinelRef}
          style={{ height: 10, background: "transparent" }}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && posts.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📢</span>
          <p className="empty-title">Nothing in your feed yet</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Be the first to post!
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <LightboxModal
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

export default SocialFeed;
