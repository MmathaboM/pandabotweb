import { useCallback } from "react";
import { useFeedStore } from "../stores/FeedStore";
import { feedService, type FeedComment, type PaginatedResponse } from "../services/FeedService";
import { getApiError } from "../services/api";

export const useFeed = () => {
  const store = useFeedStore();

  const refresh = useCallback(async () => {
    store.setRefreshing(true);
    store.setError(null);
    try {
      const res = await feedService.getFeed(1);
      store.setPosts(res.data);
      store.setPage(1);
    } catch (err) {
      store.setError(getApiError(err));
    } finally {
      store.setRefreshing(false);
    }
  }, [store]);

  const load = useCallback(async () => {
    if (store.isLoading || store.posts.length > 0) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const res = await feedService.getFeed(1);
      store.setPosts(res.data);
    } catch (err) {
      store.setError(getApiError(err));
    } finally {
      store.setLoading(false);
    }
  }, [store.isLoading, store.posts.length, store]);

  const loadMore = useCallback(async () => {
    if (store.isLoading || !store.hasMore) return;
    const nextPage = store.page + 1;
    store.setLoading(true);
    try {
      const res = await feedService.getFeed(nextPage);
      store.appendPosts(res.data, res.meta.current_page < res.meta.last_page);
      store.setPage(nextPage);
    } catch {
      // silently fail on pagination
    } finally {
      store.setLoading(false);
    }
  }, [store.isLoading, store.hasMore, store.page, store]);

  const toggleLike = useCallback(async (postId: number) => {
    store.toggleLike(postId);
    try {
      await feedService.toggleLike(postId);
    } catch {
      store.toggleLike(postId);
    }
  }, [store]);

  const togglePin = useCallback(
    async (postId: number, currentlyPinned: boolean) => {
      store.togglePin(postId);
      try {
        await feedService.updatePost(postId, { is_pinned: !currentlyPinned });
      } catch {
        store.togglePin(postId);
      }
    },
    [store],
  );

  const createPost = useCallback(
    async (content: string, media?: File[]): Promise<boolean> => {
      try {
        const post = await feedService.createPost({ content, media });
        store.prependPost(post);
        return true;
      } catch (err) {
        store.setError(getApiError(err));
        return false;
      }
    },
    [store],
  );

  const fetchComments = useCallback(
    async (postId: number, page = 1, limit = 20): Promise<PaginatedResponse<FeedComment>> => {
      try {
        return await feedService.getComments(postId, page, limit);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
        return { 
          data: [], 
          meta: { 
            current_page: 1, 
            last_page: 1, 
            per_page: limit, 
            total: 0 
          } 
        };
      }
    },
    [],
  );

  const fetchCommentReplies = useCallback(
    async (commentId: number, page = 1, limit = 20): Promise<PaginatedResponse<FeedComment>> => {
      try {
        return await feedService.getCommentReplies(commentId, page, limit);
      } catch (error) {
        console.error("Failed to fetch replies:", error);
        return { 
          data: [], 
          meta: { 
            current_page: 1, 
            last_page: 1, 
            per_page: limit, 
            total: 0 
          } 
        };
      }
    },
    [],
  );

  const addComment = useCallback(
    async (
      postId: number,
      content: string,
      parentId?: number,
    ): Promise<FeedComment | null> => {
      try {
        const comment = await feedService.createComment(
          postId,
          content,
          parentId,
        );
        store.updateCommentCount(postId, 1);
        return comment;
      } catch (error) {
        console.error("Failed to add comment:", error);
        return null;
      }
    },
    [store],
  );

  const deletePost = useCallback(
    async (postId: number) => {
      try {
        await feedService.deletePost(postId);
        store.setPosts(store.posts.filter((p) => p.id !== postId));
      } catch (err) {
        store.setError(getApiError(err));
      }
    },
    [store],
  );

  return {
    posts: store.posts,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    hasMore: store.hasMore,
    error: store.error,
    load,
    refresh,
    loadMore,
    toggleLike,
    togglePin,
    createPost,
    fetchComments,
    fetchCommentReplies,
    addComment,
    deletePost,
  };
};