"use client";

import React, { useEffect, useState } from "react";

interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export default function AiForecastsForumPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/forums/ai-forecasts");
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Couldn't load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Please enter both title and content");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/forums/ai-forecasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create post");
        return;
      }
      setPosts((prev) => [data, ...prev]);
      setTitle("");
      setContent("");
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Error creating post");
    } finally {
      setCreating(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400">
        Loading posts...
      </div>
    );

  return (
    <main className="min-h-screen bg-black text-white py-24 px-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-yellow-400">
        🤖 AI Forecasts & Analysis
      </h1>

      <form
        onSubmit={handleCreatePost}
        className="max-w-3xl mx-auto bg-[#111] p-6 rounded-2xl shadow-lg border border-yellow-700/40 mb-10"
      >
        <h2 className="text-lg font-semibold text-yellow-300 mb-3">
          Create a New Post
        </h2>

        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-3 p-3 rounded-lg bg-neutral-900 border border-gray-700 text-white"
        />

        <textarea
          placeholder="Write your content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full p-3 rounded-lg bg-neutral-900 border border-gray-700 text-white"
        />

        <button
          type="submit"
          disabled={creating}
          className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 rounded-lg font-semibold disabled:opacity-50 transition"
        >
          {creating ? "Posting..." : "Create Post"}
        </button>
      </form>

      <div className="max-w-3xl mx-auto space-y-6">
        {error && <p className="text-red-400 text-center">{error}</p>}
        {posts.length === 0 ? (
          <p className="text-gray-400 text-center">
            No posts yet. Be the first!
          </p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-[#111] p-6 rounded-2xl shadow-lg border border-yellow-700/20"
            >
              <h2 className="text-xl font-semibold text-yellow-300">
                {post.title}
              </h2>
              <p className="text-gray-400 mt-2 whitespace-pre-line">
                {post.content}
              </p>
              <p className="text-xs text-gray-600 mt-3">
                Posted {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
