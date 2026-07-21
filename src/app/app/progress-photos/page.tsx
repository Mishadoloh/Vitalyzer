'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Download, ImagePlus, LockKeyhole, MoveHorizontal, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useSession } from 'next-auth/react';

const DB_NAME = 'vitalyzer-progress-photos';
const STORE_NAME = 'photos';

interface StoredPhoto {
  id: string;
  date: string;
  note: string;
  weightKg: number | null;
  blob: Blob;
  createdAt: string;
  ownerId?: string;
}

interface PhotoView {
  id: string;
  date: string;
  note: string;
  weightKg: number | null;
  createdAt: string;
  url: string;
}

function todayISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPhotos(): Promise<StoredPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as StoredPhoto[]).sort((a, b) => b.date.localeCompare(a.date)));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function putPhoto(photo: StoredPhoto): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(photo);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function removePhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSize = 1400;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступний');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не вдалося обробити фото'))), 'image/jpeg', 0.86);
  });
}

export default function ProgressPhotosPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<PhotoView[]>([]);
  const [photos, setPhotos] = useState<PhotoView[]>([]);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [saving, setSaving] = useState(false);

  async function uploadPhoto(photo: StoredPhoto) {
    const form = new FormData();
    form.set('id', photo.id);
    form.set('date', photo.date);
    form.set('note', photo.note);
    form.set('weightKg', photo.weightKg === null ? '' : String(photo.weightKg));
    form.set('createdAt', photo.createdAt);
    form.set('image', new File([photo.blob], `${photo.id}.jpg`, { type: photo.blob.type || 'image/jpeg' }));
    const response = await fetch('/api/progress-photos', { method: 'POST', body: form });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || 'Не вдалося синхронізувати фото');
    }
  }

  async function load() {
    const localRows = await getPhotos();
    const transferFrom = localStorage.getItem('vitalyzer-progress-photos-transfer-from-v1');
    const owner = localStorage.getItem('vitalyzer-progress-photos-owner-v1');
    const ignoreLegacy = localStorage.getItem('vitalyzer-progress-photos-ignore-legacy-v1') === 'true';
    const ownedRows = localRows.filter((photo) => photo.ownerId === userId || photo.ownerId === transferFrom || (!ignoreLegacy && !photo.ownerId && owner === userId));
    await Promise.all(ownedRows.map((photo) => uploadPhoto(photo)));
    if (userId) {
      await Promise.all(ownedRows.filter((photo) => photo.ownerId !== userId).map((photo) => putPhoto({ ...photo, ownerId: userId })));
      localStorage.removeItem('vitalyzer-progress-photos-transfer-from-v1');
    }
    const response = await fetch('/api/progress-photos', { cache: 'no-store' });
    if (!response.ok) throw new Error('Не вдалося завантажити приватні фото');
    const rows = await response.json() as Array<Omit<PhotoView, 'url'> & { imageUrl: string }>;
    setPhotos((current) => {
      const next = rows.map((photo) => ({ ...photo, url: photo.imageUrl }));
      photosRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    if (userId) load().catch((e) => showToast(e instanceof Error ? e.message : String(e), true));
    return () => undefined;
  }, [userId]);

  const oldest = useMemo(() => [...photos].sort((a, b) => a.date.localeCompare(b.date))[0], [photos]);
  const newest = photos[0];
  const weeksTracked = photos.length > 1 && oldest && newest ? Math.max(1, Math.round((new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;

  async function addPhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Оберіть файл зображення', true);
      return;
    }
    setSaving(true);
    try {
      const blob = await resizeImage(file);
      const created: StoredPhoto = {
        id: crypto.randomUUID(),
        date,
        note: note.trim(),
        weightKg: weightKg ? Number(weightKg) : null,
        blob,
        createdAt: new Date().toISOString(),
        ownerId: userId,
      };
      await putPhoto(created);
      await uploadPhoto(created);
      setNote('');
      setWeightKg('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
      showToast('Фото прогресу збережено та синхронізовано');
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSaving(false);
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm('Видалити це фото прогресу з усіх синхронізованих пристроїв?')) return;
    const response = await fetch(`/api/progress-photos/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Не вдалося видалити фото');
    await removePhoto(id);
    await load();
    showToast('Фото видалено');
  }

  return (
    <section className="pb-8">
      <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,0.98),rgba(12,24,26,0.98))] p-5 shadow-xl shadow-black/20">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
          <LockKeyhole size={13} />
          приватно й синхронізовано
        </span>
        <h1 className="m-0 text-2xl font-bold text-text">Фото прогресу</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Додавайте одне фото на тиждень, щоб бачити форму разом із вагою. Знімки доступні лише у вашому акаунті та захищені авторизацією.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-border bg-bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-text">
            <ImagePlus size={16} className="text-accent" />
            Додати тижневе фото
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs text-text-muted">
              Дата
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-text" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-text-muted">
              Вага, кг
              <input type="number" step={0.1} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-text" />
            </label>
            <div className="flex flex-col gap-1.5 text-xs text-text-muted">
              <span>Фото</span>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => addPhoto(e.target.files?.[0] ?? null)} hidden />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent/60 disabled:opacity-60">
                <ImagePlus size={15} />
                {saving ? 'Зберігаю...' : 'Додати фото'}
              </button>
            </div>
          </div>
          <label className="mt-3 flex flex-col gap-1.5 text-xs text-text-muted">
            Нотатка
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Наприклад: після тренування, той самий ракурс, ранкове фото..." className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-text" />
          </label>
          <p className="mt-3 text-xs leading-5 text-text-muted">
            Порада: робіть фото в однаковому світлі, з однакової відстані й у той самий день тижня. Так прогрес видно чесніше.
          </p>
        </section>

        <aside className="rounded-3xl border border-border bg-bg-card p-4">
          <Camera size={18} className="mb-3 text-accent" />
          <div className="text-xs text-text-muted">Знімків</div>
          <div className="text-3xl font-bold text-text">{photos.length}</div>
          <div className="mt-3 text-xs text-text-muted">Тижнів між першим і останнім</div>
          <div className="text-xl font-semibold text-text">{weeksTracked || '-'}</div>
          <button onClick={() => fileRef.current?.click()} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-strong px-4 py-3 text-sm font-semibold text-[#06281c] disabled:opacity-60">
            <ImagePlus size={15} />
            {saving ? 'Зберігаю...' : 'Додати фото'}
          </button>
        </aside>
      </div>

      {oldest && newest && oldest.id !== newest.id && (
        <section className="mb-4 rounded-3xl border border-border bg-bg-card p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-text">Порівняння до / після</h2>
              <p className="mt-1 text-xs leading-5 text-text-muted">Тягніть межу, щоб побачити різницю між першим і останнім фото.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] text-accent">
              <MoveHorizontal size={13} />
              слайдер
            </span>
          </div>
          <BeforeAfterCompare before={oldest} after={newest} />
        </section>
      )}

      <section className="rounded-3xl border border-border bg-bg-card p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-text">Історія фото</h2>
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg-elevated p-6 text-center text-sm text-text-muted">
            Фото ще немає. Додайте перший знімок, а наступний зробіть через тиждень.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <article key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-bg-elevated">
                <img src={photo.url} alt={`Фото прогресу за ${photo.date}`} className="aspect-[4/5] w-full object-cover" />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-text">{new Date(photo.date).toLocaleDateString('uk-UA')}</div>
                      <div className="text-xs text-text-muted">{photo.weightKg ? `${photo.weightKg} кг` : 'вага не вказана'}</div>
                    </div>
                    <button onClick={() => deletePhoto(photo.id)} className="rounded-lg border border-danger/30 p-2 text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {photo.note && <p className="mt-2 text-xs leading-5 text-text-muted">{photo.note}</p>}
                  <a href={photo.url} download={`metrivyn-photo-${photo.date}.jpg`} className="mt-3 inline-flex items-center gap-1 text-xs text-accent underline">
                    <Download size={13} />
                    завантажити
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function BeforeAfterCompare({ before, after }: { before: PhotoView; after: PhotoView }) {
  const [position, setPosition] = useState(50);
  const deltaWeight = before.weightKg !== null && after.weightKg !== null ? after.weightKg - before.weightKg : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-elevated">
        <div className="relative aspect-[4/5] max-h-[680px] min-h-[360px] w-full select-none overflow-hidden bg-black sm:aspect-[16/10]">
          <img src={before.url} alt={`До: ${before.date}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
            <img src={after.url} alt={`Після: ${after.date}`} className="h-full w-full object-cover" draggable={false} />
          </div>
          <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">Після</div>
          <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">До</div>
          <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_18px_rgba(255,255,255,0.8)]" style={{ left: `${position}%` }} />
          <div
            className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-bg-card/90 text-accent shadow-xl shadow-black/35 backdrop-blur"
            style={{ left: `${position}%` }}
          >
            <MoveHorizontal size={20} />
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-label="Межа порівняння до і після"
            className="absolute inset-x-0 bottom-0 h-full cursor-ew-resize opacity-0"
          />
        </div>
        <div className="border-t border-border p-3">
          <input
            type="range"
            min={5}
            max={95}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-label="Позиція слайдера порівняння"
            className="w-full accent-emerald-400"
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-bg-elevated p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">порівняння</div>
        <div className="mt-3 space-y-3 text-sm">
          <PhotoMeta label="До" photo={before} />
          <PhotoMeta label="Після" photo={after} />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-bg-card p-3">
          <div className="text-xs text-text-muted">Зміна ваги</div>
          <div className="mt-1 text-xl font-bold text-text">
            {deltaWeight === null ? '-' : `${deltaWeight > 0 ? '+' : ''}${deltaWeight.toFixed(1)} кг`}
          </div>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            Вага не завжди показує форму, тому фото краще дивитися разом із трендом і самопочуттям.
          </p>
        </div>
      </aside>
    </div>
  );
}

function PhotoMeta({ label, photo }: { label: string; photo: PhotoView }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 font-semibold text-text">{new Date(photo.date).toLocaleDateString('uk-UA')}</div>
      <div className="mt-1 text-xs text-text-muted">{photo.weightKg ? `${photo.weightKg} кг` : 'вага не вказана'}</div>
      {photo.note && <p className="mt-2 text-xs leading-5 text-text-muted">{photo.note}</p>}
    </div>
  );
}
