import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FeedMedia {
  id: number;
  url: string;
  type: "image" | "video";
}

export interface FeedPostUser {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  initials: string;
  role?: string;
}

export interface FeedPost {
  id: number;
  title?: string | null;
  content: string;
  visibility: string;
  is_pinned: boolean;
  is_flagged: boolean;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  created_at: string;
  time_ago?: string;
  user: FeedPostUser;
  media: FeedMedia[];
}

interface FeedState {
  posts: FeedPost[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  setPosts: (posts: FeedPost[]) => void;
  appendPosts: (posts: FeedPost[], hasMore: boolean) => void;
  prependPost: (post: FeedPost) => void;
  updatePost: (post: FeedPost) => void;
  toggleLike: (postId: number) => void;
  togglePin: (postId: number) => void;
  updateCommentCount: (postId: number, delta: number) => void;
  setLoading: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setError: (e: string | null) => void;
  setPage: (p: number) => void;
  reset: () => void;
}

const initialState = {
  posts: [] as FeedPost[],
  page: 1,
  hasMore: true,
  isLoading: false,
  isRefreshing: false,
  error: null,
};

/** Build initials + full name from raw API user object */
export function normalizeUser(raw: any): FeedPostUser {
  const first = raw?.first_name ?? "";
  const last = raw?.last_name ?? "";
  const full =
    [first, last].filter(Boolean).join(" ") || raw?.email || "Unknown";
  const initials =
    ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() ||
    (raw?.email?.[0] ?? "?").toUpperCase();
  return {
    id: raw?.id,
    name: full,
    first_name: first || undefined,
    last_name: last || undefined,
    email: raw?.email,
    initials,
    role: raw?.role,
  };
}

/** Normalise a raw API post into our FeedPost shape */
export function normalizePost(raw: any): FeedPost {
  return {
    id: raw.id,
    title: raw.title ?? null,
    content: raw.content ?? "",
    visibility: raw.visibility ?? "public",
    is_pinned: Boolean(raw.is_pinned),
    is_flagged: Boolean(raw.is_flagged),
    likes_count: Number(raw.likes_count ?? 0),
    comments_count: Number(raw.comments_count ?? 0),
    liked_by_me: Boolean(raw.liked_by_me ?? raw.is_liked ?? false),
    created_at: raw.created_at ?? "",
    time_ago: raw.time_ago,
    user: normalizeUser(raw.user),
    media: Array.isArray(raw.media) ? raw.media : [],
  };
}

export const useFeedStore = create<FeedState>()(
  persist(
    (set) => ({
      ...initialState,

      setPosts: (posts) => set({ posts, page: 1, hasMore: posts.length >= 10 }),

      appendPosts: (posts, hasMore) =>
        set((state) => ({
          posts: [
            ...state.posts,
            ...posts.filter((p) => !state.posts.some((e) => e.id === p.id)),
          ],
          hasMore,
        })),

      prependPost: (post) =>
        set((state) => ({ posts: [post, ...state.posts] })),

      updatePost: (post) =>
        set((state) => ({
          posts: state.posts.map((p) => (p.id === post.id ? post : p)),
        })),

      toggleLike: (postId) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  liked_by_me: !p.liked_by_me,
                  likes_count: p.liked_by_me
                    ? p.likes_count - 1
                    : p.likes_count + 1,
                }
              : p,
          ),
        })),

      togglePin: (postId) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, is_pinned: !p.is_pinned } : p,
          ),
        })),

      updateCommentCount: (postId, delta) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, comments_count: Math.max(0, p.comments_count + delta) }
              : p,
          ),
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setRefreshing: (isRefreshing) => set({ isRefreshing }),
      setError: (error) => set({ error }),
      setPage: (page) => set({ page }),
      reset: () => set(initialState),
    }),
    {
      name: "feed-storage",
      partialize: (state) => ({ posts: state.posts.slice(0, 20) }),
    },
  ),
);
