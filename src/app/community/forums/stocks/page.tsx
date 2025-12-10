"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCcw,
  PlusCircle,
  Trash2,
  MessageCircle,
  CornerDownRight,
  Flag,
  Heart,
} from "lucide-react";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  isDeleted: boolean;
  isFlagged: boolean;
  user: { id: number; name: string | null; image?: string | null };
  replies?: Comment[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  user: { id: number; name: string | null; email: string };
  _count: { comments: number };
}

export default function StocksCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComments, setNewComments] = useState<Record<number, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<number | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  // ❤️ Likes
  const [likes, setLikes] = useState<Record<number, number>>({});
  const [userLiked, setUserLiked] = useState<Record<number, boolean>>({});

  // 🔥 Reactions (for posts + comments)
  const [reactions, setReactions] = useState<
    Record<string, { [emoji: string]: number }>
  >({});
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});

  // 🟢 Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts?forum=stocks");
      const data = await res.json();
      setPosts(data);

      const likeData: Record<number, number> = {};
      const likedStatus: Record<number, boolean> = {};
      const reactionsData: Record<string, { [emoji: string]: number }> = {};
      const userReactionData: Record<string, string[]> = {};

      for (const post of data) {
        const [likeRes, reactionRes] = await Promise.all([
          fetch(`/api/likes?postId=${post.id}`, { credentials: "include" }),
          fetch(`/api/reactions?postId=${post.id}`, { credentials: "include" }),
        ]);

        const likeInfo = await likeRes.json();
        const reactInfo = await reactionRes.json();

        likeData[post.id] = likeInfo.likes || 0;
        likedStatus[post.id] = likeInfo.userLiked || false;

        reactionsData[`post-${post.id}`] = {};
        (reactInfo.reactions || []).forEach(
          (r: { emoji: string; count: number }) =>
            (reactionsData[`post-${post.id}`][r.emoji] = r.count)
        );
        userReactionData[`post-${post.id}`] = reactInfo.userReactions || [];
      }

      setLikes(likeData);
      setUserLiked(likedStatus);
      setReactions(reactionsData);
      setUserReactions(userReactionData);
    } catch (err) {
      console.error("❌ Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ❤️ Like toggle
  const handleLikeToggle = async (postId: number) => {
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to like post");
        return;
      }

      setUserLiked((prev) => ({ ...prev, [postId]: data.liked }));
      setLikes((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (data.liked ? 1 : -1),
      }));
    } catch (err) {
      console.error("❌ Error liking post:", err);
    }
  };

  // ⚡ Reaction toggle (optimistic)
  const handleReactionToggle = async (
    type: "post" | "comment",
    id: number,
    emoji: string
  ) => {
    const key = `${type}-${id}`;
    const prevReactions = reactions[key] || {};
    const prevUser = userReactions[key] || [];
    const hasReacted = prevUser.includes(emoji);

    // Optimistic UI
    setReactions((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [emoji]: (prev[key]?.[emoji] || 0) + (hasReacted ? -1 : 1),
      },
    }));
    setUserReactions((prev) => ({
      ...prev,
      [key]: hasReacted
        ? prev[key].filter((r) => r !== emoji)
        : [...(prev[key] || []), emoji],
    }));

    try {
      await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          [`${type}Id`]: id,
          emoji,
        }),
      });
    } catch (err) {
      console.error("❌ Reaction error:", err);
      setReactions((prev) => ({ ...prev, [key]: prevReactions }));
      setUserReactions((prev) => ({ ...prev, [key]: prevUser }));
    }
  };

  // 🟢 Create post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...newPost, forumId: 1 }),
      });
      if (res.ok) {
        setNewPost({ title: "", content: "" });
        fetchPosts();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to create post");
      }
    } catch (err) {
      console.error("❌ Error creating post:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // 🟢 Delete post
  const handleDeletePost = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("❌ Error deleting post:", err);
    }
  };

  // 🟢 Toggle comments
  const toggleComments = async (postId: number) => {
    if (expandedPostId === postId) return setExpandedPostId(null);
    setExpandedPostId(postId);
    await fetchComments(postId);
  };

  // 🟢 Fetch comments
  const fetchComments = async (postId: number) => {
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      const data = await res.json();
      setComments((prev) => ({ ...prev, [postId]: data }));

      // 🔥 Fetch reactions for comments
      const reactionData: Record<string, { [emoji: string]: number }> = {};
      const userReactData: Record<string, string[]> = {};

      for (const comment of data) {
        const resReact = await fetch(`/api/reactions?commentId=${comment.id}`, {
          credentials: "include",
        });
        const info = await resReact.json();
        reactionData[`comment-${comment.id}`] = {};
        (info.reactions || []).forEach(
          (r: { emoji: string; count: number }) =>
            (reactionData[`comment-${comment.id}`][r.emoji] = r.count)
        );
        userReactData[`comment-${comment.id}`] = info.userReactions || [];
      }

      setReactions((prev) => ({ ...prev, ...reactionData }));
      setUserReactions((prev) => ({ ...prev, ...userReactData }));
    } catch (err) {
      console.error("❌ Failed to fetch comments:", err);
    }
  };

  // 🟢 Create comment
  const handleCommentSubmit = async (postId: number) => {
    const content = newComments[postId];
    if (!content) return;
    setCommentSubmitting(postId);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, postId }),
      });
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
    } catch (err) {
      console.error("❌ Error posting comment:", err);
    } finally {
      setCommentSubmitting(null);
    }
  };

  // 🟢 Reply to a comment
  const handleReplySubmit = async (postId: number, parentId: number) => {
    const replyContent = replyInputs[parentId];
    if (!replyContent) return;
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: replyContent,
          postId,
          parentId,
        }),
      });
      setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo(null);
      fetchComments(postId);
    } catch (err) {
      console.error("❌ Error posting reply:", err);
    }
  };

  // 🟢 Delete comment
  const handleDeleteComment = async (commentId: number, postId: number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchComments(postId);
    } catch (err) {
      console.error("❌ Error deleting comment:", err);
    }
  };

  // 🟢 Flag comment
  const handleFlagComment = async (commentId: number, postId: number) => {
    if (!confirm("Report this comment as inappropriate?")) return;
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isFlagged: true }),
      });
      alert("🚩 Comment flagged for review.");
      fetchComments(postId);
    } catch (err) {
      console.error("❌ Error flagging comment:", err);
    }
  };

  const emojis = ["🔥", "👍", "💡", "🧠"];

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1000] text-white pt-24 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold mb-6 text-center"
        >
          📈 Stocks Community
        </motion.h1>

        {/* Create Post */}
        <form
          onSubmit={handleCreatePost}
          className="bg-[#111] rounded-2xl p-5 mb-8 shadow-lg"
        >
          <input
            type="text"
            placeholder="Post title..."
            value={newPost.title}
            onChange={(e) =>
              setNewPost({ ...newPost, title: e.target.value })
            }
            className="w-full p-3 rounded-lg bg-black border border-gray-700 mb-3 text-white"
            required
          />
          <textarea
            placeholder="Share your thoughts about stocks..."
            value={newPost.content}
            onChange={(e) =>
              setNewPost({ ...newPost, content: e.target.value })
            }
            className="w-full p-3 rounded-lg bg-black border border-gray-700 text-white"
            rows={4}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-medium"
          >
            <PlusCircle size={18} />
            {submitting ? "Posting..." : "Create Post"}
          </button>
        </form>

        {/* Posts */}
        {loading ? (
          <p className="text-center text-gray-400">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-400">No posts yet. Be the first!</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111] rounded-2xl p-5 shadow-md hover:shadow-amber-700/20 transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2 text-amber-500">
                  {post.title}
                </h2>
                <p className="text-gray-300 mb-3">{post.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    By {post.user?.name || "Unknown"} • {post._count.comments}{" "}
                    comments • {new Date(post.createdAt).toLocaleString()}
                  </span>

                  <div className="flex gap-3 items-center">
                    {/* ❤️ Like */}
                    <button
                      onClick={() => handleLikeToggle(post.id)}
                      className={`flex items-center gap-1 transition ${
                        userLiked[post.id]
                          ? "text-red-500"
                          : "text-gray-400 hover:text-red-400"
                      }`}
                    >
                      <Heart
                        size={16}
                        fill={userLiked[post.id] ? "red" : "none"}
                        stroke={userLiked[post.id] ? "red" : "gray"}
                      />
                      {likes[post.id] || 0}
                    </button>

                    {/* 🔥 Emoji Reactions */}
                    <div className="flex gap-2">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() =>
                            handleReactionToggle("post", post.id, emoji)
                          }
                          className={`text-sm ${
                            userReactions[`post-${post.id}`]?.includes(emoji)
                              ? "opacity-100"
                              : "opacity-50 hover:opacity-100"
                          }`}
                        >
                          {emoji}{" "}
                          {reactions[`post-${post.id}`]?.[emoji] || 0}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className="hover:text-amber-500 flex items-center gap-1"
                    >
                      <MessageCircle size={16} /> Comments
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Comments */}
                {expandedPostId === post.id && (
                  <div className="mt-5 bg-black/30 rounded-xl p-4 border border-gray-700">
                    <div className="mb-4">
                      <textarea
                        placeholder="Write a comment..."
                        value={newComments[post.id] || ""}
                        onChange={(e) =>
                          setNewComments({
                            ...newComments,
                            [post.id]: e.target.value,
                          })
                        }
                        className="w-full p-3 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white"
                        rows={2}
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.id)}
                        className="mt-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                      >
                        Post Comment
                      </button>
                    </div>

                    {comments[post.id]?.length ? (
                      <div className="space-y-3">
                        {comments[post.id].map((comment) => (
                          <div
                            key={comment.id}
                            className="border-t border-gray-700 pt-2"
                          >
                            <p
                              className={
                                comment.isDeleted
                                  ? "text-gray-500 italic"
                                  : "text-gray-200"
                              }
                            >
                              {comment.isDeleted
                                ? "[deleted]"
                                : comment.content}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {comment.user?.name || "Anonymous"} •{" "}
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>

                            {!comment.isDeleted && (
                              <>
                                <div className="flex items-center gap-3 mt-1">
                                  <button
                                    onClick={() =>
                                      setReplyingTo(
                                        replyingTo === comment.id
                                          ? null
                                          : comment.id
                                      )
                                    }
                                    className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
                                  >
                                    <CornerDownRight size={12} /> Reply
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(comment.id, post.id)
                                    }
                                    className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleFlagComment(comment.id, post.id)
                                    }
                                    className="text-xs text-gray-400 hover:text-amber-500 flex items-center gap-1"
                                  >
                                    <Flag size={12} />{" "}
                                    {comment.isFlagged ? "Flagged" : "Flag"}
                                  </button>
                                </div>

                                {/* 💬 Reactions for comments */}
                                <div className="flex gap-2 ml-2 mt-1">
                                  {emojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() =>
                                        handleReactionToggle(
                                          "comment",
                                          comment.id,
                                          emoji
                                        )
                                      }
                                      className={`text-xs ${
                                        userReactions[
                                          `comment-${comment.id}`
                                        ]?.includes(emoji)
                                          ? "opacity-100"
                                          : "opacity-50 hover:opacity-100"
                                      }`}
                                    >
                                      {emoji}{" "}
                                      {
                                        reactions[`comment-${comment.id}`]?.[
                                          emoji
                                        ] || 0
                                      }
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Replies */}
                            {replyingTo === comment.id && (
                              <div className="mt-2 ml-4">
                                <textarea
                                  placeholder="Write a reply..."
                                  value={replyInputs[comment.id] || ""}
                                  onChange={(e) =>
                                    setReplyInputs({
                                      ...replyInputs,
                                      [comment.id]: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm"
                                  rows={2}
                                />
                                <button
                                  onClick={() =>
                                    handleReplySubmit(post.id, comment.id)
                                  }
                                  className="mt-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
                                >
                                  Post Reply
                                </button>
                              </div>
                            )}

                            {comment.replies?.length && (
                              <div className="ml-4 mt-3 border-l border-gray-700 pl-3 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id}>
                                    <p
                                      className={
                                        reply.isDeleted
                                          ? "text-gray-500 italic"
                                          : "text-gray-300 text-sm"
                                      }
                                    >
                                      ↳{" "}
                                      {reply.isDeleted
                                        ? "[deleted]"
                                        : reply.content}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {reply.user?.name || "User"} •{" "}
                                      {new Date(
                                        reply.createdAt
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm text-center">
                        No comments yet.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
