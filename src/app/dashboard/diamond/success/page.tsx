'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiamondSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard/diamond');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="success-page">
      <h1>💎 Welcome to the Diamond Plan!</h1>
      <p>You're now part of our most elite tier. Your benefits include:</p>
      <ul>
        <li>📡 Real-time market data and alerts</li>
        <li>🧠 AI-driven trade signals and insights</li>
        <li>🧑‍💼 Dedicated analyst support</li>
        <li>🔒 Early access to new features</li>
      </ul>
      <p>Redirecting to your dashboard...</p>
    </div>
  );
}