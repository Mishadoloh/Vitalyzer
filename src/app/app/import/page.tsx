'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Database,
  Dumbbell,
  Moon,
  Plus,
  Scale,
  Sparkles,
  UploadCloud,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { buildRecords, detectType, FIELD_ALIASES, guessMapping, readFileAsRows } from '@/lib/parser';
import type { EntryType, FieldMapping } from '@/lib/types';
import { showToast } from '@/lib/toast';

const FIELD_LABELS: Record<string, string> = {
  date: 'Дата',
  hours: 'Години сну',
  quality: 'Якість сну',
  bedtime: 'Час сну',
  wakeTime: 'Пробудження',
  type: 'Тип тренування',
  durationMin: 'Тривалість, хв',
  calories: 'Калорії',
  intensity: 'Інтенсивність',
  avgHR: 'Середній пульс',
  distanceKm: 'Дистанція, км',
  proteinG: 'Білок, г',
  carbsG: 'Вуглеводи, г',
  fatG: 'Жири, г',
  waterMl: 'Вода, мл',
  weightKg: 'Вага, кг',
  bodyFatPct: '% жиру',
  mood: 'Настрій',
  energy: 'Енергія',
  stress: 'Стрес',
  notes: 'Нотатки',
};

const TYPE_META: Record<EntryType, { label: string; hint: string; icon: LucideIcon; required: string[] }> = {
  sleep: { label: 'Сон', hint: 'дата, години, якість', icon: Moon, required: ['date', 'hours'] },
  workouts: { label: 'Тренування', hint: 'дата, тип, хвилини', icon: Dumbbell, required: ['date', 'type', 'durationMin'] },
  nutrition: { label: 'Харчування', hint: 'дата, калорії, білок', icon: Utensils, required: ['date', 'calories', 'proteinG'] },
  weight: { label: 'Вага', hint: 'дата, кг', icon: Scale, required: ['date', 'weightKg'] },
  mood: { label: 'Настрій', hint: 'дата, настрій, енергія', icon: Activity, required: ['date', 'mood', 'energy'] },
};

const TYPES = Object.keys(TYPE_META) as EntryType[];

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

function getOptionalFields(type: EntryType) {
  const required = new Set(TYPE_META[type].required);
  return Object.keys(FIELD_ALIASES[type]).filter((field) => !required.has(field));
}

export default function ImportPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [preferredType, setPreferredType] = useState<EntryType>('sleep');
  const [mapType, setMapType] = useState<EntryType>('sleep');
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [showOptional, setShowOptional] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const modalItem = queue.find((item) => item.id === modalItemId);
  const completedCount = queue.filter((item) => item.status === 'ok').length;
  const requiredFields = TYPE_META[mapType].required;
  const optionalFields = getOptionalFields(mapType);
  const mappedRequired = requiredFields.filter((field) => mapping[field]).length;
  const canImport = Boolean(mapping.date) && mappedRequired >= Math.min(2, requiredFields.length);

  const fileSummary = useMemo(() => {
    if (!modalItem) return null;
    return {
      rows: modalItem.rows?.length ?? 0,
      headers: modalItem.headers?.length ?? 0,
      mapped: Object.values(mapping).filter(Boolean).length,
      total: Object.keys(FIELD_ALIASES[mapType]).length,
    };
  }, [mapType, mapping, modalItem]);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function openReview(item: QueueItem, type: EntryType) {
    setModalItemId(item.id);
    setMapType(type);
    setMapping(guessMapping(type, item.headers || []));
    setShowOptional(false);
  }

  async function handleFiles(files: File[]) {
    const allowed = files.filter((file) => /\.(csv|xlsx|xls)$/i.test(file.name));
    if (!allowed.length) {
      showToast('Оберіть CSV або Excel файл', true);
      return;
    }

    const pendingItems: QueueItem[] = allowed.map((file) => ({ id: uid(), fileName: file.name, status: 'pending' }));
    setQueue((prev) => [...prev, ...pendingItems]);

    for (let index = 0; index < allowed.length; index++) {
      const file = allowed[index];
      const item = pendingItems[index];
      try {
        const { headers, rows } = await readFileAsRows(file);
        if (!headers.length || !rows.length) {
          updateItem(item.id, { status: 'error', note: 'Файл порожній або не розпізнано' });
          continue;
        }
        const guessedType = detectType(headers) || preferredType;
        const readyItem = { ...item, status: 'awaiting-review' as const, headers, rows, guessedType };
        updateItem(item.id, readyItem);
        if (!modalItemId) openReview(readyItem, guessedType);
      } catch (e) {
        updateItem(item.id, { status: 'error', note: e instanceof Error ? e.message : 'Помилка читання файлу' });
      }
    }
  }

  function onFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length) handleFiles(files);
    event.target.value = '';
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(event.dataTransfer.files));
  }

  function changeMapType(type: EntryType) {
    setMapType(type);
    setPreferredType(type);
    setMapping(guessMapping(type, modalItem?.headers || []));
    setShowOptional(false);
  }

  function openNextReview() {
    const next = queue.find((item) => item.status === 'awaiting-review' && item.id !== modalItemId);
    if (next) openReview(next, next.guessedType || preferredType);
  }

  function cancelModal() {
    if (modalItemId) updateItem(modalItemId, { status: 'error', note: 'Скасовано' });
    setModalItemId(null);
    setTimeout(openNextReview, 0);
  }

  async function confirmModal() {
    const item = queue.find((queueItem) => queueItem.id === modalItemId);
    if (!item) return;
    if (!mapping.date) {
      showToast('Оберіть колонку з датою. Без неї імпорт неможливий.', true);
      return;
    }

    const { records, skipped } = buildRecords(mapType, item.rows || [], mapping);
    if (!records.length) {
      updateItem(item.id, { status: 'error', note: 'Не вдалося розпізнати жодного запису' });
    } else {
      try {
        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: mapType, records }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Помилка імпорту');
        updateItem(item.id, {
          status: 'ok',
          note: `${TYPE_META[mapType].label}: додано ${result.added}, оновлено ${result.updated}${skipped ? `, пропущено ${skipped}` : ''}`,
        });
        showToast(`Імпортовано "${item.fileName}"`);
      } catch (e) {
        updateItem(item.id, { status: 'error', note: e instanceof Error ? e.message : 'Помилка імпорту' });
      }
    }

    setModalItemId(null);
    setTimeout(openNextReview, 0);
  }

  async function loadDemoData() {
    setSeedingDemo(true);
    try {
      const response = await fetch('/api/demo-data', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося додати демо-дані');
      showToast(result.message || 'Демо-дані додано');
      router.push('/app');
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSeedingDemo(false);
    }
  }

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Імпорт даних</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Завантажте CSV або Excel з телефона чи комп'ютера. Ми автоматично знайдемо колонки, а вам лишиться швидко перевірити відповідність.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[11px] text-text-muted sm:grid-cols-3">
        <Step number="1" label="Тип" active />
        <Step number="2" label="Файл" active={queue.length > 0} />
        <Step number="3" label="Перевірка" active={completedCount > 0} />
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Що імпортуємо?</h2>
            <p className="text-xs text-text-muted">Якщо файл зрозумілий, тип визначиться автоматично.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TYPES.map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => setPreferredType(type)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  preferredType === type ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-elevated text-text-muted hover:border-accent/50 hover:text-text'
                }`}
              >
                <Icon size={17} className="mb-2" />
                <div className="text-sm font-semibold">{meta.label}</div>
                <div className="mt-0.5 text-[11px] opacity-80">{meta.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${
          dragOver ? 'border-accent bg-accent/10' : 'border-border bg-bg-card'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple hidden onChange={onFileInputChange} />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <UploadCloud size={24} />
        </div>
        <p className="text-base font-semibold text-text">Обрати файл з телефона</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-muted">
          Підтримуються `.csv`, `.xlsx`, `.xls`. Можна вибрати кілька файлів одразу.
        </p>
        <button className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent-strong px-5 py-3 text-sm font-semibold text-[#06281c]">
          <Plus size={16} />
          Вибрати файл
        </button>
      </div>

      <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={loadDemoData}
          disabled={seedingDemo}
          className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-left transition-colors hover:border-accent/60 disabled:opacity-60"
        >
          <Sparkles size={18} className="mb-2 text-accent" />
          <div className="text-sm font-semibold text-text">{seedingDemo ? 'Додаю приклад...' : 'Немає файлу? Додати демо-дані'}</div>
          <div className="mt-1 text-xs text-text-muted">Створить 14 днів прикладів для дашборду та трендів.</div>
        </button>
        <a href="/api/backup" className="rounded-2xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/50">
          <Database size={18} className="mb-2 text-info" />
          <div className="text-sm font-semibold text-text">Спершу зробити backup</div>
          <div className="mt-1 text-xs text-text-muted">Завантажити JSON-копію перед великим імпортом.</div>
        </a>
      </div>

      {queue.length > 0 && (
        <div className="mt-4.5 rounded-2xl border border-border bg-bg-card p-4">
          <h2 className="mb-3 text-[15px] font-semibold text-text">Файли</h2>
          <div className="flex flex-col gap-2.5">
            {queue.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-bg-elevated p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">{item.fileName}</div>
                    <div className={`mt-1 text-xs ${item.status === 'ok' ? 'text-accent-strong' : item.status === 'error' ? 'text-danger' : 'text-text-muted'}`}>
                      {item.status === 'ok' && (item.note || 'Імпортовано')}
                      {item.status === 'error' && (item.note || 'Помилка')}
                      {item.status === 'pending' && 'Читаю файл...'}
                      {item.status === 'awaiting-review' && `Потрібна перевірка: ${TYPE_META[item.guessedType || preferredType].label}`}
                    </div>
                  </div>
                  {item.status === 'awaiting-review' && (
                    <button onClick={() => openReview(item, item.guessedType || preferredType)} className="shrink-0 rounded-lg bg-accent-strong px-3 py-2 text-xs font-semibold text-[#06281c]">
                      Перевірити
                    </button>
                  )}
                  {item.status === 'ok' && <CheckCircle2 size={18} className="shrink-0 text-accent-strong" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-bg-elevated p-4 shadow-2xl sm:w-[620px] sm:rounded-2xl sm:p-6">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-start justify-between gap-3 border-b border-border bg-bg-elevated px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-text">Перевірка файлу</h2>
                <p className="truncate text-xs text-text-muted">{modalItem.fileName}</p>
              </div>
              <button onClick={cancelModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border">
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Рядків" value={String(fileSummary?.rows ?? 0)} />
              <MiniStat label="Колонок" value={String(fileSummary?.headers ?? 0)} />
              <MiniStat label="Знайдено" value={`${fileSummary?.mapped ?? 0}/${fileSummary?.total ?? 0}`} />
            </div>

            <label className="flex flex-col gap-1.5 text-xs text-text-muted">
              Тип даних
              <select value={mapType} onChange={(event) => changeMapType(event.target.value as EntryType)} className="rounded-xl border border-border bg-bg-card px-3 py-3 text-sm text-text">
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_META[type].label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 rounded-2xl border border-border bg-bg-card p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text">Головні поля</div>
                  <div className="text-xs text-text-muted">Перевірте тільки найважливіше для імпорту.</div>
                </div>
                <span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] text-accent">
                  {mappedRequired}/{requiredFields.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {requiredFields.map((field) => (
                  <FieldSelect key={field} field={field} headers={modalItem.headers || []} mapping={mapping} onChange={setMapping} required />
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowOptional((value) => !value)}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-border bg-bg-card px-3 py-3 text-sm text-text-muted"
            >
              Додаткові поля
              <ChevronDown size={16} className={showOptional ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {showOptional && (
              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-border bg-bg-card p-3">
                {optionalFields.map((field) => (
                  <FieldSelect key={field} field={field} headers={modalItem.headers || []} mapping={mapping} onChange={setMapping} />
                ))}
              </div>
            )}

            <div className="sticky bottom-0 -mx-4 mt-5 flex gap-2 border-t border-border bg-bg-elevated px-4 py-4 sm:-mx-6 sm:px-6">
              <button onClick={cancelModal} className="flex-1 rounded-xl border border-border bg-bg-card px-4 py-3 text-sm">
                Скасувати
              </button>
              <button onClick={confirmModal} disabled={!canImport} className="flex-1 rounded-xl bg-accent-strong px-4 py-3 text-sm font-semibold text-[#06281c] disabled:opacity-50">
                Імпортувати
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Step({ number, label, active }: { number: string; label: string; active: boolean }) {
  return (
    <div className={`rounded-xl border px-2 py-2 ${active ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border bg-bg-card'}`}>
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs font-bold">{number}</div>
      {label}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="text-lg font-bold text-text">{value}</div>
      <div className="text-[11px] text-text-muted">{label}</div>
    </div>
  );
}

function FieldSelect({
  field,
  headers,
  mapping,
  onChange,
  required,
}: {
  field: string;
  headers: string[];
  mapping: FieldMapping;
  onChange: React.Dispatch<React.SetStateAction<FieldMapping>>;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-muted">
      <span className="flex items-center gap-1">
        {FIELD_LABELS[field] || field}
        {required && <span className="text-accent">*</span>}
      </span>
      <select
        value={mapping[field] || ''}
        onChange={(event) => onChange((current) => ({ ...current, [field]: event.target.value }))}
        className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-3 text-sm text-text"
      >
        <option value="">Не використовувати</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}
