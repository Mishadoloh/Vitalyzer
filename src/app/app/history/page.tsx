'use client';

import { useEffect, useState } from 'react';
import { showToast } from '@/lib/toast';
import type { EntryType } from '@/lib/types';

const TYPE_LABELS: Record<EntryType, string> = {
  sleep: 'Сон',
  workouts: 'Тренування',
  nutrition: 'Харчування',
  weight: 'Вага',
  mood: 'Настрій',
};

const COLUMNS: Record<EntryType, [string, string][]> = {
  sleep: [
    ['date', 'Дата'],
    ['hours', 'Години'],
    ['quality', 'Якість'],
  ],
  workouts: [
    ['date', 'Дата'],
    ['type', 'Тип'],
    ['durationMin', 'Хв'],
    ['calories', 'Ккал'],
    ['avgHR', 'Пульс'],
    ['distanceKm', 'Км'],
  ],
  nutrition: [
    ['date', 'Дата'],
    ['calories', 'Ккал'],
    ['proteinG', 'Білки'],
    ['carbsG', 'Вугл.'],
    ['fatG', 'Жири'],
    ['waterMl', 'Вода мл'],
  ],
  weight: [
    ['date', 'Дата'],
    ['weightKg', 'Вага, кг'],
    ['bodyFatPct', '% жиру'],
  ],
  mood: [
    ['date', 'Дата'],
    ['mood', 'Настрій'],
    ['energy', 'Енергія'],
    ['stress', 'Стрес'],
    ['notes', 'Нотатки'],
  ],
};

type Row = Record<string, string | number | null> & { id: string; date: string };

export default function HistoryPage() {
  const [tab, setTab] = useState<EntryType>('sleep');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(tab);
  }, [tab]);

  async function load(type: EntryType) {
    setLoading(true);
    try {
      const data = await fetch(`/api/${type}`).then((r) => r.json());
      data.sort((a: Row, b: Row) => (a.date < b.date ? 1 : -1));
      setRows(data);
    } catch (e) {
      showToast('Не вдалося завантажити історію: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRow(id: string) {
    await fetch(`/api/${tab}/${id}`, { method: 'DELETE' });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function clearCategory() {
    if (!confirm(`Видалити всі записи категорії «${TYPE_LABELS[tab]}»?`)) return;
    await fetch(`/api/${tab}?all=true`, { method: 'DELETE' });
    setRows([]);
    showToast('Категорію очищено');
  }

  const cols = COLUMNS[tab];

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Історія записів</h1>
      </header>

      <div className="mb-2.5 flex gap-1.5">
        {(['sleep', 'workouts', 'nutrition', 'weight', 'mood'] as EntryType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3.5 py-2 text-[13px] ${
              tab === t ? 'border-accent text-accent' : 'border-border text-text-muted'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mb-2.5">
        <button onClick={clearCategory} className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10">
          Очистити цю категорію
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        {loading && <p className="p-4 text-text-muted">Завантаження...</p>}
        {!loading && rows.length === 0 && (
          <p className="p-4 text-text-muted">Немає записів. Імпортуйте дані на вкладці «Імпорт даних».</p>
        )}
        {!loading && rows.length > 0 && (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {cols.map(([, label]) => (
                  <th key={label} className="sticky top-0 border-b border-border bg-bg-elevated px-3 py-2.5 text-left font-semibold text-text-muted">
                    {label}
                  </th>
                ))}
                <th className="border-b border-border bg-bg-elevated px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {cols.map(([key]) => (
                    <td key={key} className="whitespace-nowrap border-b border-border px-3 py-2.5">
                      {row[key] ?? '—'}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-border px-3 py-2.5">
                    <button onClick={() => deleteRow(row.id)} className="text-xs text-danger">
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
