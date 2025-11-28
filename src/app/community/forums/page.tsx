"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Forum {
  id: number;
  title: string;
  slug: string;
  description?: string;
}

export default function ForumsPage() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForums = async () => {
      try {
        const res = await fetch("/api/forums");
        const data = await res.json();
        setForums(data);
      } catch (error) {
        console.error("Error fetching forums:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForums();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-300">
        Loading forums...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white py-24 px-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-yellow-400">
        Community Forums
      </h1>

      <div className="max-w-3xl mx-auto space-y-6">
        {forums.map((forum) => (
          <Link
            key={forum.id}
            href={`/community/forums/${forum.slug}`}
            className="block bg-[#111] p-6 rounded-2xl shadow hover:shadow-lg hover:bg-[#222] transition"
          >
            <h2 className="text-xl font-semibold text-yellow-300">{forum.title}</h2>
            <p className="text-gray-400 mt-2">{forum.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
