'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Comment { id: number; author: string; content: string; createdAt: string; }
interface Post { id: number; author: string; content: string; likes: number; createdAt: string; comments: Comment[]; }

export default function StockMarketRoom() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('room_stock_market');
    if (saved) setPosts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('room_stock_market', JSON.stringify(posts));
  }, [posts]);

  const addPost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: Date.now(),
      author: 'Trader',
      content: newPost,
      likes: 0,
      createdAt: new Date().toLocaleString(),
      comments: [],
    };
    setPosts([post, ...posts]);
    setNewPost('');
  };

  const likePost = (id: number) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));
  };

  const addComment = (id: number, text: string) => {
    if (!text.trim()) return;
    const comment: Comment = {
      id: Date.now(),
      author: 'Member',
      content: text,
      createdAt: new Date().toLocaleString(),
    };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, comments: [comment, ...p.comments] } : p
      )
    );
  };

  return (
    <main className="min-h-screen bg-hero-background text-foreground py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h1 className="text-4xl md:text-5xl font-bold text-center mb-6">🧾 Stock Market Room</motion.h1>
        <p className="text-center text-foreground-accent mb-8">
          Join traders and investors to discuss market trends, earnings, and top stock picks.
        </p>

        {/* Post Box */}
        <div className="bg-white/80 p-5 rounded-2xl shadow-sm mb-10">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full border border-gray-300 rounded-xl p-3 mb-3 focus:ring-2 focus:ring-primary"
          />
          <button onClick={addPost} className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary/90">
            Post Message
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-5">
          {posts.map((p) => (
            <motion.div key={p.id} className="bg-white/90 p-5 rounded-xl shadow border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{p.author}</span>
                <span className="text-xs text-gray-500">{p.createdAt}</span>
              </div>
              <p className="mb-3 text-gray-800">{p.content}</p>
              <button onClick={() => likePost(p.id)} className="text-primary text-sm font-semibold hover:underline">
                👍 {p.likes} Likes
              </button>

              {/* Comments */}
              <div className="mt-4 border-t pt-2">
                <CommentBox onAdd={(t) => addComment(p.id, t)} />
                <div className="mt-3 space-y-2 pl-3 border-l border-gray-200">
                  {p.comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 p-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{c.author}</span>
                        <span className="text-xs text-gray-500">{c.createdAt}</span>
                      </div>
                      <p className="text-sm">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}

function CommentBox({ onAdd }: { onAdd: (text: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Write a reply..."
        className="flex-1 border rounded-lg px-3 py-2 text-sm"
      />
      <button
        onClick={() => {
          onAdd(val);
          setVal('');
        }}
        className="text-sm text-primary font-semibold hover:underline"
      >
        Reply
      </button>
    </div>
  );
}
