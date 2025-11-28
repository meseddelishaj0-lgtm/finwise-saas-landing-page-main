"use client";

export default function StatsPage() {
  const stats = [
    {
      title: "10,000+",
      description: "Members use our AI Research, providing real-time insights.",
    },
    {
      title: "5.0",
      description:
        "Star rating, consistently from our members for exceptional service and support.",
    },
    {
      title: "200+",
      description:
        "Hedge Funds & RIAs use our AI Research to deliver alpha returns.",
    },
  ];

  return (
    <section
      id="stats"
      className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a] py-24"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      {/* Subtle gold glow in background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-yellow-400 transition-all duration-700 hover:text-yellow-300">
          Platform Statistics
        </h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {stats.map((s, i) => (
            <div
              key={i}
              className="p-6 bg-gradient-to-b from-[#111] to-[#1a1a1a] rounded-2xl border border-gray-800 hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(255,215,0,0.2)] transition-all duration-300 transform hover:-translate-y-2"
            >
              <h3 className="text-3xl font-bold text-yellow-300 mb-3">
                {s.title}
              </h3>
              <p className="text-gray-300">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
