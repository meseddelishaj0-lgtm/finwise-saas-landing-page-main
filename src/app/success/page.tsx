"use client";
import React from "react";
import Link from "next/link";

const SuccessPage = () => {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-night text-center px-6">
      <h1 className="text-3xl text-green-400 mb-4 font-display font-normal tracking-tight md:text-4xl">Payment Successful!</h1>
      <p className="text-gray-300 mb-6">
        Thank you for subscribing! Your payment was processed successfully.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard/gold" className="bg-yellow-400 hover:bg-gold text-night font-semibold px-4 py-2 rounded">
          Go to Dashboard
        </Link>
        <Link href="/" className="bg-white/10 hover:bg-white/15 text-gray-100 font-semibold px-4 py-2 rounded">
          Back to Home
        </Link>
      </div>
    </main>
  );
};

export default SuccessPage;
