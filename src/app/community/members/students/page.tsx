'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Comment { id: number; userId: number; content: string; createdAt: string; }
interface Post { id: number; userId: number; content: string; likes: number; createdAt: string; comments: Comment[]; }

interface UserProfile {
  id: number;
  name: string;
  username: string;
  profileImage?: string;
}

export default function StudentsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<number, UserProfile>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('member_students');
    if (saved) setPosts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('member_students', JSON.stringify(posts));
  }, [posts]);

  // Get current user ID from localStorage or URL params
  useEffect(() => {
    const getUserId = () => {
      // Try localStorage first (set by mobile app)
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        setCurrentUserId(parseInt(storedUserId));
        return;
      }

      // Try URL params (passed from mobile app)
      const urlParams = new URLSearchParams(window.location.search);
      const userIdParam = urlParams.get('userId');
      if (userIdParam) {
        setCurrentUserId(parseInt(userIdParam));
        localStorage.setItem('userId', userIdParam);
        return;
      }

      // Default fallback
      setCurrentUserId(1);
    };

    getUserId();
  }, []);

  // Fetch user profiles for all posts/comments
  useEffect(() => {
    const userIds = Array.from(new Set([
      ...posts.map((p) => p.userId),
      ...posts.flatMap((p) => p.comments.map((c) => c.userId)),
    ]));
    async function fetchProfiles() {
      const profiles: Record<number, UserProfile> = {};
      await Promise.all(
        userIds.map(async (id) => {
          if (!id || userProfiles[id]) return;
          try {
            const res = await fetch(`/api/user/profile?userId=${id}`);
            if (res.ok) {
              const data = await res.json();
              profiles[id] = {
                id: data.id,
                name: data.name,
                username: data.username,
                profileImage: data.profileImage,
              };
            }
          } catch {}
        })
      );
      if (Object.keys(profiles).length > 0) {
        setUserProfiles((prev) => ({ ...prev, ...profiles }));
      }
    }
    if (userIds.length > 0) fetchProfiles();
  }, [posts]);

  const addPost = () => {
    if (!newPost.trim() || !currentUserId) return;
    const post: Post = {
      id: Date.now(),
      userId: currentUserId,
      content: newPost,
      likes: 0,
      createdAt: new Date().toLocaleString(),
      comments: [],
    };
    setPosts([post, ...posts]);
    setNewPost('');
  };

  const likePost = (id: number) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));

  const addComment = (id: number, text: string) => {
    if (!text.trim() || !currentUserId) return;
    const comment: Comment = { id: Date.now(), userId: currentUserId, content: text, createdAt: new Date().toLocaleString() };
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: [comment, ...p.comments] } : p)));
  };

  return (
    <main className="min-h-screen bg-hero-background text-foreground py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
          📊 Finance Students & Learners
        </motion.h1>
        <p className="text-center text-foreground-accent mb-8">
          Join a learning community of finance students and aspiring analysts to grow your market knowledge.
        </p>

        <PostInput value={newPost} setValue={setNewPost} onSubmit={addPost} currentUserId={currentUserId} />
        <PostList posts={posts} likePost={likePost} addComment={addComment} userProfiles={userProfiles} />
      </div>
    </main>
  );
}

function PostInput({ value, setValue, onSubmit, currentUserId }: any) {
  return (
    <div className="bg-white/80 p-5 rounded-2xl shadow-sm mb-10">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={currentUserId ? "Share your study tips or market lessons..." : "Please login to post"}
        rows={3}
        className="w-full border border-gray-300 rounded-xl p-3 mb-3 focus:ring-2 focus:ring-primary"
        disabled={!currentUserId}
      />
      <button 
        onClick={onSubmit} 
        className={`px-6 py-2 rounded-full hover:bg-primary/90 ${currentUserId ? 'bg-primary text-white' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}
        disabled={!currentUserId}
      >
        Post Insight
      </button>
    </div>
  );
}

function PostList({ posts, likePost, addComment }: any) {
  const [userProfiles, setUserProfiles] = useState<Record<number, UserProfile>>({});

  useEffect(() => {
    const userIds = Array.from(new Set([
      ...posts.map((p: any) => p.userId),
      ...posts.flatMap((p: any) => p.comments.map((c: any) => c.userId)),
    ]));
    async function fetchProfiles() {
      const profiles: Record<number, UserProfile> = {};
      await Promise.all(
        userIds.map(async (id) => {
          if (!id || userProfiles[id]) return;
          try {
            const res = await fetch(`/api/user/profile?userId=${id}`);
            if (res.ok) {
              const data = await res.json();
              profiles[id] = {
                id: data.id,
                name: data.name,
                username: data.username,
                profileImage: data.profileImage,
              };
            }
          } catch {}
        })
      );
      if (Object.keys(profiles).length > 0) {
        setUserProfiles((prev) => ({ ...prev, ...profiles }));
      }
    }
    if (userIds.length > 0) fetchProfiles();
  }, [posts]);

  return (
    <div className="space-y-5">
      {posts.map((p: any) => {
        const user = userProfiles[p.userId];
        return (
          <motion.div key={p.id} className="bg-white/90 p-5 rounded-xl shadow border border-gray-100">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">
                {user ? (
                  <>
                    {user.profileImage && (
                      <img src={user.profileImage} alt="avatar" className="inline-block w-6 h-6 rounded-full mr-2 align-middle" />
                    )}
                    {user.name} <span className="text-gray-400">@{user.username}</span>
                  </>
                ) : 'Loading...'}
              </span>
              <span className="text-xs text-gray-500">{p.createdAt}</span>
            </div>
            <p className="mb-3">{p.content}</p>
            <button onClick={() => likePost(p.id)} className="text-primary text-sm font-semibold hover:underline">
              👍 {p.likes} Likes
            </button>
            <div className="mt-4 border-t pt-2">
              <CommentBox onAdd={(t: string) => addComment(p.id, t)} />
              <CommentList comments={p.comments} userProfiles={userProfiles} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function CommentBox({ onAdd }: { onAdd: (text: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Reply..."
        className="flex-1 border rounded-lg px-3 py-2 text-sm"
      />
      <button onClick={() => { onAdd(val); setVal(''); }} className="text-sm text-primary font-semibold hover:underline">
        Reply
      </button>
    </div>
  );
}

function CommentList({ comments, userProfiles }: any) {
  return (
    <div className="space-y-2 mt-3 pl-3 border-l border-gray-200">
      {comments.map((c: any) => {
        const user = userProfiles[c.userId];
        return (
          <div key={c.id} className="bg-gray-50 p-2 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">
                {user ? (
                  <>
                    {user.profileImage && (
                      <img src={user.profileImage} alt="avatar" className="inline-block w-5 h-5 rounded-full mr-2 align-middle" />
                    )}
                    {user.name} <span className="text-gray-400">@{user.username}</span>
                  </>
                ) : 'Loading...'}
              </span>
              <span className="text-xs text-gray-500">{c.createdAt}</span>
            </div>
            <p className="text-sm">{c.content}</p>
          </div>
        );
      })}
    </div>
  );
}
