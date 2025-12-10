"use client";

import { useRouter } from "next/navigation";

export default function MemberNetworkPage() {
  const router = useRouter();

  const members = [
    {
      name: "💼 Professional Investors",
      description:
        "Connect with experienced portfolio managers, analysts, and traders to exchange professional insights.",
      link: "/community/members/investors",
    },
    {
      name: "🧠 AI & Data Analysts",
      description:
        "Collaborate with AI engineers and data scientists using models to forecast trends and evaluate stocks.",
      link: "/community/members/analysts",
    },
    {
      name: "📊 Finance Students & Learners",
      description:
        "Join a learning community of finance students and aspiring analysts to grow your market knowledge.",
      link: "/community/members/students",
    },
    {
      name: "🤝 Networking Events",
      description:
        "Access exclusive online meetups, webinars, and collaboration sessions to expand your professional network.",
      link: "/community/members/events",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1
            onClick={() => router.push("/dashboard")}
            className="text-2xl font-semibold text-gray-900 cursor-pointer"
          >
            🤝 Member Network
          </h1>
          <button
            onClick={() => router.push("/community")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2 rounded-full font-medium transition-all"
          >
            ← Back to Community
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-14 text-center">
        <h2 className="text-4xl font-bold mb-4 text-gray-900">Member Network</h2>
        <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
          Build relationships with investors, analysts, and entrepreneurs. 
          Grow your reputation and share your research within the WallStreetStocks community.
        </p>

        {/* Member Categories */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member) => (
            <div
              key={member.name}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left border border-gray-100 cursor-pointer"
              onClick={() => router.push(member.link)}
            >
              <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
              <p className="text-gray-600 mb-4">{member.description}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(member.link);
                }}
                className="text-yellow-600 font-semibold hover:underline"
              >
                Learn More →
              </button>
            </div>
          ))}
        </section>

        {/* CTA */}
        <div className="mt-16 text-center">
          <button
            onClick={() => router.push("/community")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-10 rounded-full transition-all"
          >
            Back to Community Hub
          </button>
        </div>
      </main>
    </div>
  );
}
