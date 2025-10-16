'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlatinumSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard/platinum');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="success-page">
      <h1>🧪 Welcome to the Platinum Plan!</h1>
      <p>Your subscription unlocks powerful tools, including:</p>
      <ul>
        <li>📈 Advanced charting and technical overlays</li>
        <li>📊 Weekly strategy reports</li>
        <li>📞 Priority support access</li>
        <li>🧩 Custom backtesting modules</li>
      </ul>
      <p>Redirecting to your dashboard...</p>
    </div>
  );
}