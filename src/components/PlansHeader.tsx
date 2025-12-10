"use client";

import { motion } from "framer-motion";
import React from "react";

const PlansHeader: React.FC = () => {
  return (
    <>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl font-bold text-center mb-12"
      >
        💎 WallStreetStocks.ai Plans
      </motion.h1>

      <p className="text-center text-gray-600 mb-16 text-lg">
        Compare plans and unlock the AI-powered tools you need to grow your
        portfolio — from automated research to real-time analytics.
      </p>
    </>
  );
};

export default PlansHeader;
