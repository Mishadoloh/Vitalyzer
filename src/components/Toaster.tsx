'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeToast } from '@/lib/toast';

export default function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeToast(({ message, error }) => {
      setMessage(message);
      setIsError(Boolean(error));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMessage(null), 4000);
    });
  }, []);

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-[100] rounded-xl border px-5 py-3 text-sm shadow-lg transition-all sm:bottom-6 sm:left-auto sm:right-6
        ${message ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}
        ${isError ? 'border-danger/50 text-danger bg-bg-elevated' : 'border-border text-text bg-bg-elevated'}`}
    >
      {message}
    </div>
  );
}
