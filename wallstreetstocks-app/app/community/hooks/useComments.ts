// app/community/hooks/useComments.ts
import { useState, useCallback } from 'react';

interface Comment {
  id: number;
  content: string;
  userId: number;
  postId: number;
  createdAt: string;
  user?: {
    name: string;
    image?: string;
  };
}

export function useComments(postId?: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      // Add your API call here
      setComments([]);
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const addComment = useCallback(async (content: string) => {
    // Add your API call here
  }, [postId]);

  return {
    comments,
    loading,
    error,
    fetchComments,
    addComment,
  };
}

export default useComments;
