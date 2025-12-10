"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface NewPostFormProps {
  slug: string;
  forumTitle?: string;
}

export default function NewPostForm({ slug, forumTitle }: NewPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/forums/${slug}/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      router.push(`/community/forums/${slug}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center py-16 px-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-bold mb-6 text-gray-900 text-center"
      >
        Create New Post {forumTitle ? `— ${forumTitle}` : ""}
      </motion.h1>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-gray-50 p-8 rounded-2xl shadow border"
      >
        <div className="mb-4">
          <label className="block font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            className="w-full border rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter your post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block font-medium text-gray-700 mb-2">Content</label>
          <textarea
            rows={8}
            className="w-full border rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Write your post content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Posting..." : `Post to ${forumTitle ?? "Forum"}`}
        </button>
      </form>
    </main>
  );
}
