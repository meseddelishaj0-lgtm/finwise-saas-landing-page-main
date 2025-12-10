"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Image, Link, Bold, Italic, List, Smile, Paperclip, X } from "lucide-react";

interface PostComposerProps {
  user: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  slug: string;
}

export default function PostComposer({ user, slug }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setContent("");
    setFiles([]);
    setPreviewUrls([]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`/api/forums/${slug}/posts`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to post");

      setContent("");
      setFiles([]);
      setPreviewUrls([]);
    } catch (err) {
      console.error("❌ Error submitting post:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl bg-[#1d1f21] border border-gray-700 rounded-2xl p-4 text-gray-200 shadow-md"
    >
      {/* Header */}
      <div className="flex items-center mb-3">
        <img
          src={user.avatarUrl || "/default-avatar.png"}
          alt="User Avatar"
          className="w-10 h-10 rounded-full mr-3"
        />
        <div>
          <p className="font-semibold text-white">{user.name}</p>
          <p className="text-sm text-gray-400">@{user.username}</p>
        </div>
      </div>

      {/* Input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`What's on your mind, ${user.name.split(" ")[0]}?`}
        className="w-full bg-transparent resize-none outline-none text-gray-100 text-base placeholder-gray-500 mb-3"
        rows={3}
      />

      {/* File Previews */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt="Preview"
                className="rounded-lg max-h-48 object-cover border border-gray-700"
              />
              <button
                onClick={() => handleRemoveFile(index)}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black/80"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-gray-700 pt-2">
        <div className="flex gap-3 text-gray-400">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              multiple
            />
            <Image size={18} />
          </label>
          <Smile size={18} />
          <Link size={18} />
          <Bold size={18} />
          <Italic size={18} />
          <List size={18} />
          <Paperclip size={18} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
              loading
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
