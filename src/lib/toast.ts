// Мінімальна клієнтська шина подій для тостів — без зайвого контекст-провайдера.
// showToast() з будь-якого клієнтського компонента, <Toaster/> в layout рендерить.
export type ToastPayload = { message: string; error?: boolean };

const EVENT_NAME = 'vitalyzer:toast';

export function showToast(message: string, error = false) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(EVENT_NAME, { detail: { message, error } }));
}

export function subscribeToast(cb: (payload: ToastPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ToastPayload>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
