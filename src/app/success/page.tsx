"use client";
import React from "react";
import Link from "next/link";

const SuccessPage = () => {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-6">
      <h1 className="text-3xl font-bold text-green-600 mb-4">🎉 Payment Successful!</h1>
      <p className="text-gray-700 mb-6">
        Thank you for subscribing! Your payment was processed successfully.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard/gold" className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded">
          Go to Dashboard
        </Link>
        <Link href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded">
          Back to Home
        </Link>
      </div>
    </main>
  );
};

export default SuccessPage;
