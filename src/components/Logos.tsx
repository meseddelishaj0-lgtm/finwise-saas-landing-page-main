import React from "react";

const Logos: React.FC = () => {
  return (
    <section id="logos" className="py-32 px-5 bg-background text-center">
      {/* Main Heading */}
      <p className="text-lg font-medium">
        Trusted by <span className="text-secondary">200+</span> Hedge Funds & RIA worldwide
      </p>

      {/* Gradient Accent Line */}
      <div className="mx-auto mt-4 h-1 w-32 bg-gradient-to-r from-blue-500 via-green-500 to-emerald-500 rounded-full"></div>

      {/* Supporting Sentence */}
      <p className="text-gray-600 mt-5 max-w-2xl mx-auto">
        Empowering every investors with AI-driven research, analytics, and 
        market intelligence to deliver consistent alpha.
      </p>
    </section>
  );
};

export default Logos;
