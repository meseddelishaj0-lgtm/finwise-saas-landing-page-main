'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GoldSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard/gold');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-night text-ivory">
      <h1 className="text-3xl mb-4 font-display font-normal tracking-tight md:text-4xl">Welcome to the Gold Plan!</h1>
      <p className="mb-2 text-gray-400">
        Your payment was successful. You now have access to:
      </p>
      <ul className="mb-6 text-gray-300 space-y-1">
        <li>Core analytics dashboard</li>
        <li>Monthly performance summaries</li>
        <li>Email alerts for key market events</li>
      </ul>
      <p className="text-sm text-gray-500">
        Redirecting to your dashboard...
      </p>
    </div>
  );
}
