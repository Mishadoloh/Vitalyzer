'use client';

import dynamic from 'next/dynamic';

// three.js is ~150kB gzipped — load it lazily on the client only, after hydration,
// so the landing page's first paint and every other route stay lightweight.
const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false });

export default function Hero3DLoader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Hero3D className="h-full w-full" />
    </div>
  );
}
