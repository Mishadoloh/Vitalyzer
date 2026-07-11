'use client';

import { useEffect, useState } from 'react';
import { FileDown, Pencil, Trash2 } from 'lucide-react';
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

interface EditField {
  key: string;
  label: string;
  kind: 'number' | 'text';
  step?: string;
}

// Date identifies the record (unique per user+day), so it stays read-only —
// to move a record to another day, delete and re-add via Quick Add.
const EDIT_FIELDS: Record<EntryType, EditField[]> = {
  sleep: [
    { key: 'hours', label: 'Години сну', kind: 'number', step: '0.1' },
    { key: 'quality', label: 'Якість (1-5)', kind: 'number', step: '0.5' },
  ],
  workouts: [
    { key: 'type', label: 'Тип тренування', kind: 'text' },
    { key: 'durationMin', label: 'Тривалість, хв', kind: 'number' },
    { key: 'calories', label: 'Калорії', kind: 'number' },
    { key: 'avgHR', label: 'Середній пульс', kind: 'number' },
    { key: 'distanceKm', label: 'Дистанція, км', kind: 'number', step: '0.1' },
  ],
  nutrition: [
    { key: 'calories', label: 'Калорії', kind: 'number' },
    { key: 'proteinG', label: 'Білки, г', kind: 'number' },
    { key: 'carbsG', label: 'Вуглеводи, г', kind: 'number' },
    { key: 'fatG', label: 'Жири, г', kind: 'number' },
    { key: 'waterMl', label: 'Вода, мл', kind: 'number' },
  ],
  weight: [
    { key: 'weightKg', label: 'Вага, кг', kind: 'number', step: '0.1' },
    { key: 'bodyFatPct', label: '% жиру в тілі', kind: 'number', step: '0.1' },
  ],
  mood: [
    { key: 'mood', label: 'Настрій (1-5)', kind: 'number' },
    { key: 'energy', label: 'Енергія (1-5)', kind: 'number' },
    { key: 'stress', label: 'Стрес (1-5)', kind: 'number' },
    { key: 'notes', label: 'Нотатки', kind: 'text' },
  ],
};

type Row = Record<string, string | number | null> & { id: string; date: string };

export default function HistoryPage() {
  const [tab, setTab] = useState<EntryType>('sleep');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  function openEdit(row: Row) {
    setEditRow(row);
    const values: Record<string, string> = {};
    for (const f of EDIT_FIELDS[tab]) {
      values[f.key] = row[f.key] === null || row[f.key] === undefined ? '' : String(row[f.key]);
    }
    setEditValues(values);
  }

  async function saveEdit() {
    if (!editRow) return;
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      for (const f of EDIT_FIELDS[tab]) {
        payload[f.key] = editValues[f.key] === '' ? null : editValues[f.key];
      }
      const res = await fetch(`/api/${tab}/${editRow.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Помилка збереження');
      showToast(`Запис за ${editRow.date} оновлено`);
      setEditRow(null);
      load(tab);
    } catch (e) {
      showToast('Не вдалося зберегти: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setSaving(false);
    }
  }

  const cols = COLUMNS[tab];

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Історія записів</h1>
      </header>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
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

      <div className="mb-2.5 flex flex-wrap gap-2">
        <a
          href={`/api/export/${tab}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:border-accent hover:text-text"
        >
          <FileDown size={13} />
          Експорт CSV ({TYPE_LABELS[tab].toLowerCase()})
        </a>
        <button
          onClick={clearCategory}
          className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
        >
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
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent"
                      >
                        <Pencil size={12} />
                        Редагувати
                      </button>
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex items-center gap-1 text-xs text-danger"
                      >
                        <Trash2 size={12} />
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="max-h-[86vh] w-[420px] max-w-full overflow-y-auto rounded-2xl border border-border bg-bg-elevated p-6">
            <h2 className="mt-0 text-lg">
              Редагування: {TYPE_LABELS[tab].toLowerCase()} за {editRow.date}
            </h2>
            <div className="mt-3.5 flex flex-col gap-3">
              {EDIT_FIELDS[tab].map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {f.label}
                  <input
                    type={f.kind}
                    step={f.step}
                    value={editValues[f.key] ?? ''}
                    onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="rounded-lg border border-border bg-bg-card px-3 py-2 text-[13.5px] text-text"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditRow(null)}
                className="rounded-lg border border-border bg-bg-card px-4 py-2 text-[13.5px]"
              >
                Скасувати
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-accent-strong px-4 py-2 text-[13.5px] font-semibold text-[#06281c] disabled:opacity-50"
              >
                {saving ? 'Зберігаємо…' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
