'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Database,
  Dumbbell,
  FileDown,
  Moon,
  Pencil,
  Scale,
  Search,
  Smile,
  Trash2,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import type { EntryType } from '@/lib/types';

const TYPE_LABELS: Record<EntryType, string> = {
  sleep: 'Сон',
  workouts: 'Тренування',
  nutrition: 'Харчування',
  weight: 'Вага',
  mood: 'Настрій',
};

const TYPE_TABS: { key: EntryType; label: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { key: 'sleep', label: 'Сон', hint: 'години та якість', icon: Moon, tone: 'text-accent bg-accent/10 border-accent/25' },
  { key: 'workouts', label: 'Тренування', hint: 'активність', icon: Dumbbell, tone: 'text-info bg-info/10 border-info/25' },
  { key: 'nutrition', label: 'Харчування', hint: 'ккал і макро', icon: Utensils, tone: 'text-warn bg-warn/10 border-warn/25' },
  { key: 'weight', label: 'Вага', hint: 'динаміка тіла', icon: Scale, tone: 'text-accent bg-accent/10 border-accent/25' },
  { key: 'mood', label: 'Настрій', hint: 'енергія', icon: Smile, tone: 'text-info bg-info/10 border-info/25' },
];

const MAX_VISIBLE_ROWS = 250;

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
  const [query, setQuery] = useState('');
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
      const response = await fetch(`/api/${type}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не вдалося завантажити записи');
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
  const activeTab = TYPE_TABS.find((item) => item.key === tab) || TYPE_TABS[0];
  const ActiveIcon = activeTab.icon;
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => cols.some(([key]) => String(row[key] ?? '').toLowerCase().includes(needle)));
  }, [cols, query, rows]);
  const visibleRows = filteredRows.slice(0, MAX_VISIBLE_ROWS);
  const latestDate = rows[0]?.date ?? '-';
  const filledCells = useMemo(() => rows.reduce((sum, row) => sum + cols.filter(([key]) => row[key] !== null && row[key] !== undefined && row[key] !== '').length, 0), [cols, rows]);

  return (
    <section className="pb-8">
      <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,0.98),rgba(15,17,21,0.98))] shadow-xl shadow-black/20">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
              <Database size={13} />
              журнал даних
            </span>
            <h1 className="m-0 text-2xl font-bold text-text">Історія записів</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Переглядайте, редагуйте, експортуйте й очищайте записи без переходів між сирими таблицями.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <HistoryStat icon={ActiveIcon} label="Записів" value={String(rows.length)} />
            <HistoryStat icon={CalendarDays} label="Останній" value={latestDate} compact />
            <HistoryStat icon={Activity} label="Полів" value={String(filledCells)} />
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {TYPE_TABS.map((item) => (
          <TypeTab key={item.key} item={item} active={tab === item.key} onClick={() => {
            setTab(item.key);
            setQuery('');
          }} />
        ))}
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-bg-card p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Пошук у розділі: ${TYPE_LABELS[tab].toLowerCase()}`}
            className="w-full rounded-xl border border-border bg-bg-elevated py-2.5 pl-9 pr-9 text-sm text-text outline-none focus:border-accent"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted hover:text-text">
              <X size={14} />
            </button>
          )}
        </label>
        <a
          href={`/api/export/${tab}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs text-text-muted hover:border-accent hover:text-text"
        >
          <FileDown size={13} />
          Експорт CSV ({TYPE_LABELS[tab].toLowerCase()})
        </a>
        <button
          onClick={clearCategory}
          disabled={rows.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/40 px-3 py-2.5 text-xs text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={13} />
          Очистити цю категорію
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-bg-card shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${activeTab.tone}`}>
              <ActiveIcon size={15} />
            </span>
            {TYPE_LABELS[tab]}
          </div>
          <div className="text-xs text-text-muted">
            Показано {visibleRows.length} з {filteredRows.length}
          </div>
        </div>

        {loading && (
          <div className="p-4">
            <div className="h-32 animate-pulse rounded-2xl bg-bg-elevated" />
          </div>
        )}
        {!loading && rows.length === 0 && <EmptyState />}
        {!loading && rows.length > 0 && filteredRows.length === 0 && (
          <p className="p-5 text-sm text-text-muted">За цим пошуком нічого не знайдено.</p>
        )}
        {!loading && visibleRows.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {cols.map(([, label]) => (
                  <th key={label} className="sticky top-0 border-b border-border bg-bg-elevated px-4 py-3 text-left font-semibold text-text-muted">
                    {label}
                  </th>
                ))}
                <th className="border-b border-border bg-bg-elevated px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-bg-elevated/55">
                  {cols.map(([key]) => (
                    <td key={key} className="whitespace-nowrap border-b border-border px-4 py-3 text-text-muted">
                      {row[key] ?? '—'}
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-border px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent"
                      >
                        <Pencil size={12} />
                        Редагувати
                      </button>
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/25 px-2 py-1.5 text-xs text-danger hover:bg-danger/10"
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
          {filteredRows.length > MAX_VISIBLE_ROWS && (
            <div className="border-t border-border bg-bg-elevated px-4 py-3 text-xs text-text-muted">
              Для швидкої роботи показано перші {MAX_VISIBLE_ROWS} записів. Уточніть пошук, щоб знайти старіші рядки.
            </div>
          )}
          </div>
        )}
      </div>

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-0 sm:items-center sm:px-4">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-bg-elevated p-5 shadow-2xl shadow-black/40 sm:w-[520px] sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                  <Pencil size={12} />
                  редагування
                </span>
                <h2 className="mt-0 text-lg">
                  {TYPE_LABELS[tab]} за {editRow.date}
                </h2>
              </div>
              <button onClick={() => setEditRow(null)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:text-text">
                <X size={16} />
              </button>
            </div>
            <div className="mt-3.5 flex flex-col gap-3">
              {EDIT_FIELDS[tab].map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {f.label}
                  <input
                    type={f.kind}
                    step={f.step}
                    value={editValues[f.key] ?? ''}
                    onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="rounded-xl border border-border bg-bg-card px-3 py-3 text-[13.5px] text-text outline-none focus:border-accent"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditRow(null)}
                className="rounded-xl border border-border bg-bg-card px-4 py-2.5 text-[13.5px]"
              >
                Скасувати
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-xl bg-accent-strong px-4 py-2.5 text-[13.5px] font-semibold text-[#06281c] disabled:opacity-50"
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

function TypeTab({
  item,
  active,
  onClick,
}: {
  item: { key: EntryType; label: string; hint: string; icon: LucideIcon; tone: string };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left shadow-sm shadow-black/10 transition-colors ${
        active ? `${item.tone} shadow-black/20` : 'border-border bg-bg-card text-text-muted hover:border-accent/40 hover:bg-bg-elevated hover:text-text'
      }`}
    >
      <Icon size={17} className="mb-2" />
      <div className="text-sm font-semibold">{item.label}</div>
      <div className="mt-0.5 text-[11px] opacity-75">{item.hint}</div>
    </button>
  );
}

function HistoryStat({ icon: Icon, label, value, compact }: { icon: LucideIcon; label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg/30 p-3">
      <Icon size={15} className="mb-2 text-accent" />
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className={`mt-0.5 font-bold text-text ${compact ? 'truncate text-sm' : 'text-lg'}`}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-5">
      <div className="rounded-2xl border border-dashed border-border bg-bg-elevated/60 p-6 text-center">
        <Database size={24} className="mx-auto text-text-muted" />
        <p className="mt-3 text-sm font-semibold text-text">Записів поки немає</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-muted">
          Імпортуйте файл або додайте перший запис вручну, щоб історія стала живою.
        </p>
      </div>
    </div>
  );
}
