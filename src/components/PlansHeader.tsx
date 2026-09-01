"use client";

import React from "react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

// Plans page masthead — same SUB command + editorial headline as the landing section.
const PlansHeader: React.FC = () => {
  return (
    <Reveal>
      <CommandLine cmd="SUB" note="membership plans" className="mb-4" />
      <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
        Choose your <em className="italic text-gold-soft">edge</em>.
      </h1>
      <p className="mt-4 text-gray-400 max-w-2xl text-lg">
        Three tiers, one desk. Start where you are — every plan is month to
        month, and you can upgrade, downgrade, or cancel from your account at
        any time.
      </p>
    </Reveal>
  );
};

export default PlansHeader;
