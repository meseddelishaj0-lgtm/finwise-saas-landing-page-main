"use client";
import React from "react";
import Link from "next/link";

interface MyPlanProps {
  plan: string | null;
}

const MyPlan: React.FC<MyPlanProps> = ({ plan }) => {
  if (!plan)
    return (
      <div className="p-6 text-center border rounded-xl bg-gray-50">
        <h2 className="text-lg font-semibold">No Active Plan</h2>
        <p className="text-sm text-gray-500 mt-2">
          You don’t have an active subscription yet.  
        </p>
        <Link
          href="/plans"
          className="inline-block mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          View Plans
        </Link>
      </div>
    );

  const normalizedPlan = plan.toLowerCase();
  const planUrl =
    normalizedPlan === "gold"
      ? "/dashboard/gold"
      : normalizedPlan === "platinum"
      ? "/dashboard/platinum"
      : normalizedPlan === "diamond"
      ? "/dashboard/diamond"
      : "/plans";

  return (
    <div className="p-6 border rounded-xl bg-white shadow-md text-center">
      <h2 className="text-lg font-semibold">Your Current Plan</h2>
      <p className="text-2xl font-bold capitalize mt-2 text-yellow-600">
        {plan}
      </p>
      <Link
        href={planUrl}
        className="inline-block mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
      >
        Go to {plan} Dashboard →
      </Link>
    </div>
  );
};

export default MyPlan;
