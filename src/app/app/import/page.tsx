'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildRecords, detectType, FIELD_ALIASES, guessMapping, readFileAsRows } from '@/lib/parser';
import type { EntryType, FieldMapping } from '@/lib/types';
import { showToast } from '@/lib/toast';

const FIELD_LABELS: Record<string, string> = {
  date: 'Дата',
  hours: 'Години сну',
  quality: 'Якість сну',
  bedtime: 'Час відходу до сну',
  wakeTime: 'Час пробудження',
  type: 'Тип тренування',
  durationMin: 'Тривалість, хв',
  calories: 'Калорії',
  intensity: 'Інтенсивність',
  avgHR: 'Середній пульс',
  distanceKm: 'Дистанція, км',
  proteinG: 'Білки, г',
  carbsG: 'Вуглеводи, г',
  fatG: 'Жири, г',
  waterMl: 'Вода, мл',
  weightKg: 'Вага, кг',
  bodyFatPct: '% жиру в тілі',
  mood: 'Настрій (1-5)',
  energy: 'Енергія (1-5)',
  stress: 'Стрес (1-5)',
  notes: 'Нотатки',
};

const TYPE_LABELS: Record<EntryType, string> = {
  sleep: 'Сон',
  workouts: 'Тренування',
  nutrition: 'Харчування',
  weight: 'Вага',
  mood: 'Настрій',
};

interface QueueItem {
  id: string;
  fileName: string;
  status: 'pending' | 'awaiting-review' | 'ok' | 'error';
  note?: string;
  headers?: string[];
  rows?: Record<string, unknown>[];
  guessedType?: EntryType;
}

function uid() {
  return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function ImportPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<EntryType>('sleep');
  const [mapping, setMapping] = useState<FieldMapping>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function handleFiles(files: File[]) {
    const newItems: QueueItem[] = files.map((f) => ({ id: uid(), fileName: f.name, status: 'pending' }));
    setQueue((prev) => [...prev, ...newItems]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = newItems[i].id;
      try {
        const { headers, rows } = await readFileAsRows(file);
        if (!headers.length || !rows.length) {
          updateItem(id, { status: 'error', note: 'Файл порожній або не розпізнано' });
          continue;
        }
        const guessedType = detectType(headers) || 'nutrition';
        updateItem(id, { status: 'awaiting-review', headers, rows, guessedType });
      } catch (e) {
        updateItem(id, { status: 'error', note: e instanceof Error ? e.message : 'Помилка читання файлу' });
      }
    }
    openNextIfIdle();
  }

  function openNextIfIdle() {
    setQueue((prev) => {
      setModalItemId((currentModal) => {
        if (currentModal) return currentModal;
        const next = prev.find((it) => it.status === 'awaiting-review');
        if (next) {
          setMapType(next.guessedType || 'sleep');
          setMapping(guessMapping(next.guessedType || 'sleep', next.headers || []));
        }
        return next ? next.id : null;
      });
      return prev;
    });
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(csv|xlsx|xls)$/i.test(f.name));
    if (files.length) handleFiles(files);
  }

  function changeMapType(type: EntryType) {
    const item = queue.find((it) => it.id === modalItemId);
    setMapType(type);
    setMapping(guessMapping(type, item?.headers || []));
  }

  function cancelModal() {
    if (modalItemId) updateItem(modalItemId, { status: 'error', note: 'Скасовано' });
    setModalItemId(null);
    setTimeout(openNextIfIdle, 0);
  }

  async function confirmModal() {
    const item = queue.find((it) => it.id === modalItemId);
    if (!item) return;
    if (!mapping.date) {
      showToast('Оберіть колонку з датою — без неї імпорт неможливий.', true);
      return;
    }

    const { records, skipped } = buildRecords(mapType, item.rows || [], mapping);
    if (!records.length) {
      updateItem(item.id, { status: 'error', note: 'Не вдалося розпізнати жодного запису' });
    } else {
      try {
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: mapType, records }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Помилка імпорту');
        updateItem(item.id, {
          status: 'ok',
          note: `${TYPE_LABELS[mapType]}: додано ${result.added}, оновлено ${result.updated}${skipped ? `, пропущено ${skipped}` : ''}`,
        });
        showToast(`Імпортовано «${item.fileName}»`);
      } catch (e) {
        updateItem(item.id, { status: 'error', note: e instanceof Error ? e.message : 'Помилка імпорту' });
      }
    }

    setModalItemId(null);
    setTimeout(openNextIfIdle, 0);
  }

  async function loadSampleData() {
    const today = new Date();
    const iso = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      return d.toISOString().slice(0, 10);
    };

    const sleepRecords = [];
    const workoutRecords = [];
    const nutritionRecords = [];
    const weightRecords = [];
    const moodRecords = [];

    let weight = 78;
    for (let i = 13; i >= 0; i--) {
      const date = iso(i);
      const isWorkoutDay = i % 2 === 0;
      const hours = Math.round((6.2 + Math.random() * 2.2) * 10) / 10;
      sleepRecords.push({
        date,
        hours,
        quality: Math.round((3 + Math.random() * 2) * 10) / 10,
      });
      if (isWorkoutDay) {
        workoutRecords.push({
          date,
          type: i % 4 === 0 ? 'Силове тренування' : 'Біг',
          durationMin: 35 + Math.round(Math.random() * 40),
          calories: 250 + Math.round(Math.random() * 300),
          avgHR: 120 + Math.round(Math.random() * 30),
          distanceKm: i % 4 === 0 ? null : Math.round((4 + Math.random() * 6) * 10) / 10,
        });
      }
      nutritionRecords.push({
        date,
        calories: 1900 + Math.round(Math.random() * 700),
        proteinG: 90 + Math.round(Math.random() * 60),
        carbsG: 180 + Math.round(Math.random() * 100),
        fatG: 60 + Math.round(Math.random() * 40),
        waterMl: 1400 + Math.round(Math.random() * 1200),
      });
      weight = Math.round((weight - 0.03 + (Math.random() - 0.5) * 0.4) * 10) / 10;
      weightRecords.push({ date, weightKg: weight, bodyFatPct: null });
      moodRecords.push({
        date,
        mood: Math.max(1, Math.min(5, Math.round(3 + (hours - 7.5) * 0.8 + (Math.random() - 0.5)))),
        energy: Math.max(1, Math.min(5, Math.round(3 + (hours - 7.5) * 0.9 + (Math.random() - 0.5)))),
        stress: Math.round(2 + Math.random() * 2),
      });
    }

    try {
      await Promise.all([
        fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'sleep', records: sleepRecords }),
        }),
        fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'workouts', records: workoutRecords }),
        }),
        fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'nutrition', records: nutritionRecords }),
        }),
        fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'weight', records: weightRecords }),
        }),
        fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'mood', records: moodRecords }),
        }),
      ]);
      showToast('Приклад даних завантажено (14 днів)');
      router.push('/app');
    } catch (e) {
      showToast('Не вдалося завантажити приклад даних: ' + (e instanceof Error ? e.message : String(e)), true);
    }
  }

  const modalItem = queue.find((it) => it.id === modalItemId);

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Імпорт даних</h1>
      </header>
      <p className="text-text-muted">
        Завантажте CSV або Excel-файли з вашого трекера (наприклад, експорти з Apple Health, Google Fit, Strava,
        MyFitnessPal, Excel-щоденник тощо). Застосунок автоматично спробує визначити тип даних (сон / тренування /
        харчування) і поля — ви зможете перевірити відповідність перед імпортом.
      </p>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? 'border-accent bg-accent/10' : 'border-border'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple hidden onChange={onFileInputChange} />
        <div className="mb-2 text-3xl text-accent">⇪</div>
        <p>
          <strong>Перетягніть файли сюди</strong> або <span className="text-accent underline">оберіть файли</span>
        </p>
        <p className="text-xs text-text-muted">Підтримуються .csv, .xlsx, .xls</p>
      </div>

      <div className="mt-4.5 flex flex-col gap-2.5">
        {queue.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-[10px] border border-border bg-bg-card px-3.5 py-3 text-[13.5px]">
            <span>{item.fileName}</span>
            <span className={item.status === 'ok' ? 'text-accent-strong' : item.status === 'error' ? 'text-danger' : ''}>
              {item.status === 'ok' && (item.note || 'Імпортовано')}
              {item.status === 'error' && (item.note || 'Помилка')}
              {item.status === 'pending' && 'Читання файлу...'}
              {item.status === 'awaiting-review' && 'Очікує перевірки полів...'}
            </span>
          </div>
        ))}
      </div>

      <div className="my-5 text-center text-xs text-text-muted">або</div>
      <button
        onClick={loadSampleData}
        className="rounded-lg border border-border bg-bg-card px-4 py-2 text-[13.5px] hover:border-accent"
      >
        Завантажити приклад даних для тесту
      </button>

      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="max-h-[86vh] w-[520px] max-w-[92vw] overflow-y-auto rounded-2xl border border-border bg-bg-elevated p-6">
            <h2 className="mt-0 text-lg">Перевірте відповідність полів</h2>
            <p className="text-xs text-text-muted">
              Файл: {modalItem.fileName} · {modalItem.rows?.length ?? 0} рядків · {modalItem.headers?.length ?? 0} колонок
            </p>

            <label className="mt-3.5 flex flex-col gap-1.5 text-xs text-text-muted">
              Тип даних
              <select
                value={mapType}
                onChange={(e) => changeMapType(e.target.value as EntryType)}
                className="rounded-lg border border-border bg-bg-card px-2.5 py-2 text-[13.5px] text-text"
              >
                <option value="sleep">Сон</option>
                <option value="workouts">Тренування</option>
                <option value="nutrition">Харчування</option>
                <option value="weight">Вага</option>
                <option value="mood">Настрій</option>
              </select>
            </label>

            <div className="mt-3 flex flex-col gap-2.5">
              {Object.keys(FIELD_ALIASES[mapType]).map((field) => (
                <label key={field} className="flex items-center justify-between gap-2.5 text-[13px] text-text-muted">
                  {FIELD_LABELS[field] || field}
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                    className="min-w-[180px] rounded-lg border border-border bg-bg-card px-2 py-1.5 text-text"
                  >
                    <option value="">— не використовувати —</option>
                    {(modalItem.headers || []).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="mt-4.5 flex justify-end gap-2">
              <button onClick={cancelModal} className="rounded-lg border border-border bg-bg-card px-4 py-2 text-[13.5px]">
                Скасувати
              </button>
              <button onClick={confirmModal} className="rounded-lg bg-accent-strong px-4 py-2 text-[13.5px] font-semibold text-[#06281c]">
                Імпортувати
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
