"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  profileImage?: string;
  name?: string;
  username?: string;
  bio?: string;
  _count?: {
    followers?: number;
    following?: number;
    posts?: number;
  };
  location?: string;
  website?: string;
};

export default function CommunityUserProfile({ params }: { params: { id: string } }) {
  const router = useRouter();
  const userId = params.id;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || Array.isArray(userId)) return;
    async function fetchUser() {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/profile?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!user) return <div className="p-10 text-center">User not found</div>;

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <div className="flex items-center gap-4 mb-6">
        {user.profileImage && (
          <img src={user.profileImage} alt="avatar" className="w-16 h-16 rounded-full border" />
        )}
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <div className="text-gray-500 text-lg">@{user.username}</div>
        </div>
      </div>
      {user.bio && <div className="mb-4 text-gray-700">{user.bio}</div>}
      <div className="flex gap-6 text-gray-600 mb-4">
        <div><strong>{user._count?.followers ?? 0}</strong> Followers</div>
        <div><strong>{user._count?.following ?? 0}</strong> Following</div>
        <div><strong>{user._count?.posts ?? 0}</strong> Posts</div>
      </div>
      {user.location && <div className="mb-2">📍 {user.location}</div>}
      {user.website && (
        <div className="mb-2">
          <a href={user.website} target="_blank" rel="noopener" className="text-blue-600 underline">{user.website}</a>
        </div>
      )}
      <div className="mt-8">
        <button onClick={() => router.back()} className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2 rounded-full font-medium transition-all">Back</button>
      </div>
    </div>
  );
}
