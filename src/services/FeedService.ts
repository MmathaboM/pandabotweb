import api from "./api";
import {
  normalizePost,
  normalizeUser,
  type FeedPost,
} from "../stores/FeedStore";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FeedComment {
  id: number;
  post_id: number;
  parent_id?: number | null;
  content: string;
  created_at: string;
  time_ago?: string;
  user: {
    id: number;
    name: string;
    initials: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  replies?: FeedComment[];
  replies_count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface FeedResponse {
  data: FeedPost[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ── Normalise comment from API ─────────────────────────────────────────────────

function normalizeComment(raw: any): FeedComment {
  return {
    id: raw.id,
    post_id: raw.post_id,
    parent_id: raw.parent_id ?? null,
    content: raw.content ?? "",
    created_at: raw.created_at ?? "",
    time_ago: raw.time_ago,
    user: normalizeUser(raw.user),
    replies: Array.isArray(raw.replies)
      ? raw.replies.map(normalizeComment)
      : [],
    replies_count: raw.replies_count ?? 0,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const feedService = {
  // ── Feed ──────────────────────────────────────────────────────────────────

  async getFeed(page = 1, limit = 20): Promise<FeedResponse> {
    const { data } = await api.get("v1/social/feed", {
      params: { page, limit },
    });
    return {
      data: (data.data ?? []).map(normalizePost),
      meta: data.meta,
    };
  },

  // ── Create post ───────────────────────────────────────────────────────────

  async createPost(payload: {
    content: string;
    title?: string;
    media?: File[];
    visibility?: string;
  }): Promise<FeedPost> {
    if (payload.media && payload.media.length > 0) {
      const form = new FormData();
      form.append("content", payload.content);
      if (payload.title) form.append("title", payload.title);
      if (payload.visibility) form.append("visibility", payload.visibility);
      payload.media.forEach((f) => form.append("media[]", f));

      const { data } = await api.post("v1/social/posts", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return normalizePost(data.post ?? data.data ?? data);
    }

    const { data } = await api.post("v1/social/posts", {
      content: payload.content,
      title: payload.title,
      visibility: payload.visibility,
    });
    return normalizePost(data.post ?? data.data ?? data);
  },

  // ── Update post ───────────────────────────────────────────────────────────

  async updatePost(
    postId: number,
    fields: Partial<{
      content: string;
      title: string;
      is_pinned: boolean;
      is_flagged: boolean;
      visibility: string;
    }>,
  ): Promise<FeedPost> {
    const { data } = await api.put(`v1/social/posts/${postId}`, fields);
    return normalizePost(data.post ?? data.data ?? data);
  },

  // ── Edit post content ─────────────────────────────────────────────────────

  async editPost(
    postId: number,
    content: string,
    title?: string,
  ): Promise<FeedPost> {
    const { data } = await api.put(`v1/social/posts/${postId}`, {
      content,
      title: title || null,
    });
    return normalizePost(data.post ?? data.data ?? data);
  },

  // ── Like / Unlike ─────────────────────────────────────────────────────────

  async toggleLike(
    postId: number,
  ): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await api.post(`v1/social/posts/${postId}/like`);
    return { liked: data.liked, likes_count: data.likes_count };
  },

  // ── Comments ──────────────────────────────────────────────────────────────

  async getComments(
    postId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<FeedComment>> {
    const { data } = await api.get(`v1/social/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return {
      data: (data.data ?? data.comments ?? []).map(normalizeComment),
      meta: data.meta || {
        current_page: page,
        last_page: 1,
        per_page: limit,
        total: 0,
      },
    };
  },

  async createComment(
    postId: number,
    content: string,
    parentId?: number,
  ): Promise<FeedComment> {
    const { data } = await api.post(`v1/social/posts/${postId}/comment`, {
      content,
      parent_id: parentId ?? null,
    });
    return normalizeComment(data.comment ?? data.data ?? data);
  },

  async updateComment(
    postId: number,
    commentId: number,
    content: string,
  ): Promise<FeedComment> {
    const { data } = await api.put(
      `v1/social/posts/${postId}/comments/${commentId}`,
      { content },
    );
    return normalizeComment(data.comment ?? data.data ?? data);
  },

  async deleteComment(postId: number, commentId: number): Promise<void> {
    await api.delete(`v1/social/posts/${postId}/comments/${commentId}`);
  },

  // ── Comment Replies ──────────────────────────────────────────────────────

  async getCommentReplies(
    commentId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<FeedComment>> {
    const { data } = await api.get(`v1/social/comments/${commentId}/replies`, {
      params: { page, limit },
    });
    return {
      data: (data.data ?? []).map(normalizeComment),
      meta: data.meta,
    };
  },

  // ── Post CRUD ─────────────────────────────────────────────────────────────

  async deletePost(postId: number): Promise<void> {
    await api.delete(`v1/social/posts/${postId}`);
  },

  async restorePost(postId: number): Promise<void> {
    await api.post(`v1/social/posts/${postId}/restore`);
  },

  async forceDeletePost(postId: number): Promise<void> {
    await api.delete(`v1/social/posts/${postId}/force`);
  },

  async getTrashed(): Promise<FeedPost[]> {
    const { data } = await api.get("v1/social/posts/trashed");
    return (data.data ?? []).map(normalizePost);
  },
};
