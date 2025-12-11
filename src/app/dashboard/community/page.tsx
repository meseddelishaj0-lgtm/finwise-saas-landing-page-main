"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Forum {
  id: number;
  title: string;
  slug: string;
  description?: string;
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    const fetchForums = async () => {
      try {
        const res = await fetch("/api/forums");
        if (res.ok) {
          const data = await res.json();
          setForums(data);
        }
      } catch (error) {
        console.error("Error fetching forums:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForums();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
        Loading community...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1
            onClick={() => router.push("/dashboard")}
            className="text-2xl font-semibold text-gray-900 cursor-pointer"
          >
            WallStreetStocks
          </h1>

          <div className="flex items-center gap-4">
            <p className="text-gray-700">
              Welcome,{" "}
              <span className="font-semibold">
                {session?.user?.name || session?.user?.email}
              </span>
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2 rounded-full font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        <div className="bg-white p-10 rounded-2xl shadow-md text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Community</h2>
          <p className="text-gray-600">
            Join discussions, share insights, and collaborate with other investors.
          </p>
        </div>

        {/* Community Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Discussion Forums */}
          <Link
            href="/community/forums"
            className="bg-white shadow-sm rounded-2xl p-8 hover:shadow-md transition-all group"
          >
            <h3 className="text-xl font-semibold mb-3 group-hover:text-yellow-600 transition-colors">
              Discussion Forums
            </h3>
            <p className="text-gray-600 mb-4">
              Talk about the latest market trends, AI forecasts, and investing ideas
              with like-minded people.
            </p>
            <span className="text-yellow-600 font-semibold">
              Explore Forums &rarr;
            </span>
          </Link>

          {/* Market Rooms */}
          <Link
            href="/community/rooms"
            className="bg-white shadow-sm rounded-2xl p-8 hover:shadow-md transition-all group"
          >
            <h3 className="text-xl font-semibold mb-3 group-hover:text-yellow-600 transition-colors">
              Market Rooms
            </h3>
            <p className="text-gray-600 mb-4">
              Join focused rooms for stocks, crypto, real estate, and macro economy
              insights.
            </p>
            <span className="text-yellow-600 font-semibold">
              Join a Room &rarr;
            </span>
          </Link>

          {/* Member Network */}
          <Link
            href="/community/members"
            className="bg-white shadow-sm rounded-2xl p-8 hover:shadow-md transition-all group"
          >
            <h3 className="text-xl font-semibold mb-3 group-hover:text-yellow-600 transition-colors">
              Member Network
            </h3>
            <p className="text-gray-600 mb-4">
              Build relationships, share research, and grow your influence in the
              financial world.
            </p>
            <span className="text-yellow-600 font-semibold">
              Meet Members &rarr;
            </span>
          </Link>
        </div>

        {/* Forums List */}
        {loading ? (
          <div className="text-center text-gray-500">Loading forums...</div>
        ) : forums.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">
              Quick Access to Forums
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forums.map((forum) => (
                <Link
                  key={forum.id}
                  href={`/community/forums/${forum.slug}`}
                  className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                      {forum.title}
                    </h4>
                    {forum.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {forum.description}
                      </p>
                    )}
                  </div>
                  <span className="text-yellow-600">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-gray-600">
              No forums available yet. Check back soon!
            </p>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-8 rounded-full transition-all"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
