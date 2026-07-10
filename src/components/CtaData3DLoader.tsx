'use client';

import dynamic from 'next/dynamic';

const CtaData3D = dynamic(() => import('./CtaData3D'), { ssr: false });

export default function CtaData3DLoader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <CtaData3D className="h-full w-full" />
    </div>
  );
}
