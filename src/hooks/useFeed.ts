
import { useCallback } from "react";
import { useFeedStore } from "../stores/FeedStore";
import { feedService, type FeedComment } from "../services/FeedService";
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
  }, []);

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
  }, [store.isLoading, store.posts.length]);

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
  }, [store.isLoading, store.hasMore, store.page]);

  /** Optimistic like — field is liked_by_me */
  const toggleLike = useCallback(async (postId: number) => {
    store.toggleLike(postId);
    try {
      await feedService.toggleLike(postId);
    } catch {
      store.toggleLike(postId); // revert
    }
  }, []);

  /**
   * Optimistic pin — calls PUT /social/posts/{id} with { is_pinned }
   * Only mmathabo@skillspanda.co.za and heita@skillspanda.co.za can see
   * the button; the backend also enforces this via canModerate() check.
   */
  const togglePin = useCallback(
    async (postId: number, currentlyPinned: boolean) => {
      store.togglePin(postId);
      try {
        await feedService.updatePost(postId, { is_pinned: !currentlyPinned });
      } catch {
        store.togglePin(postId); // revert
      }
    },
    [],
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
    [],
  );

  const fetchComments = useCallback(
    async (postId: number): Promise<FeedComment[]> => {
      try {
        return await feedService.getComments(postId);
      } catch {
        return [];
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
      } catch {
        return null;
      }
    },
    [],
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
    [store, feedService],
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
    addComment,
    deletePost,
  };
};
