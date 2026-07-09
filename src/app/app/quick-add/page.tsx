'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import type { EntryType } from '@/lib/types';

const TABS: { key: EntryType; label: string }[] = [
  { key: 'sleep', label: 'Сон' },
  { key: 'workouts', label: 'Тренування' },
  { key: 'nutrition', label: 'Харчування' },
  { key: 'weight', label: 'Вага' },
  { key: 'mood', label: 'Настрій' },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-muted">
      {label}
      {children}
    </label>
  );
}

const inputCls = 'rounded-lg border border-border bg-bg-card px-3 py-2 text-[13.5px] text-text';

export default function QuickAddPage() {
  const [tab, setTab] = useState<EntryType>('sleep');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [sleep, setSleep] = useState({ hours: 7.5, quality: 3, bedtime: '', wakeTime: '' });
  const [workout, setWorkout] = useState({ type: 'Біг', durationMin: 30, calories: '', avgHR: '', distanceKm: '' });
  const [nutrition, setNutrition] = useState({ calories: 2000, proteinG: 100, carbsG: 220, fatG: 70, waterMl: 2000 });
  const [weight, setWeight] = useState({ weightKg: 75, bodyFatPct: '' });
  const [mood, setMood] = useState({ mood: 3, energy: 3, stress: 3, notes: '' });

  async function submit() {
    let type: EntryType = tab;
    let record: Record<string, unknown>;

    if (tab === 'sleep') {
      record = { date, hours: sleep.hours, quality: sleep.quality || null, bedtime: sleep.bedtime || null, wakeTime: sleep.wakeTime || null };
    } else if (tab === 'workouts') {
      record = {
        date,
        type: workout.type,
        durationMin: workout.durationMin,
        calories: workout.calories === '' ? null : Number(workout.calories),
        avgHR: workout.avgHR === '' ? null : Number(workout.avgHR),
        distanceKm: workout.distanceKm === '' ? null : Number(workout.distanceKm),
      };
    } else if (tab === 'nutrition') {
      record = { date, ...nutrition };
    } else if (tab === 'weight') {
      record = { date, weightKg: weight.weightKg, bodyFatPct: weight.bodyFatPct === '' ? null : Number(weight.bodyFatPct) };
    } else {
      record = { date, mood: mood.mood, energy: mood.energy, stress: mood.stress, notes: mood.notes || null };
    }

    setSaving(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, records: [record] }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Помилка збереження');
      showToast(`Збережено: ${TABS.find((t) => t.key === type)?.label} за ${date}`);
      router.push('/app');
    } catch (e) {
      showToast('Не вдалося зберегти запис: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Швидкий запис</h1>
      </header>
      <p className="text-text-muted">
        Додайте сьогоднішні (або будь-якої іншої дати) показники вручну — без підготовки CSV-файлу. Повторне
        збереження за ту саму дату оновлює запис (для тренувань — додає ще одне).
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg border px-3.5 py-2 text-[13px] ${
              tab === t.key ? 'border-accent text-accent' : 'border-border text-text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-md rounded-2xl border border-border bg-bg-card p-5">
        <Field label="Дата">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>

        {tab === 'sleep' && (
          <div className="mt-3.5 flex flex-col gap-3">
            <Field label="Години сну">
              <input type="number" step="0.1" value={sleep.hours} onChange={(e) => setSleep({ ...sleep, hours: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Якість сну (1-5)">
              <input type="number" min={1} max={5} step="0.5" value={sleep.quality} onChange={(e) => setSleep({ ...sleep, quality: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Час відходу до сну">
              <input type="time" value={sleep.bedtime} onChange={(e) => setSleep({ ...sleep, bedtime: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Час пробудження">
              <input type="time" value={sleep.wakeTime} onChange={(e) => setSleep({ ...sleep, wakeTime: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}

        {tab === 'workouts' && (
          <div className="mt-3.5 flex flex-col gap-3">
            <Field label="Тип тренування">
              <input type="text" value={workout.type} onChange={(e) => setWorkout({ ...workout, type: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Тривалість, хв">
              <input type="number" value={workout.durationMin} onChange={(e) => setWorkout({ ...workout, durationMin: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Калорії (опційно)">
              <input type="number" value={workout.calories} onChange={(e) => setWorkout({ ...workout, calories: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Середній пульс (опційно)">
              <input type="number" value={workout.avgHR} onChange={(e) => setWorkout({ ...workout, avgHR: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Дистанція, км (опційно)">
              <input type="number" step="0.1" value={workout.distanceKm} onChange={(e) => setWorkout({ ...workout, distanceKm: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}

        {tab === 'nutrition' && (
          <div className="mt-3.5 flex flex-col gap-3">
            <Field label="Калорії">
              <input type="number" value={nutrition.calories} onChange={(e) => setNutrition({ ...nutrition, calories: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Білки, г">
              <input type="number" value={nutrition.proteinG} onChange={(e) => setNutrition({ ...nutrition, proteinG: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Вуглеводи, г">
              <input type="number" value={nutrition.carbsG} onChange={(e) => setNutrition({ ...nutrition, carbsG: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Жири, г">
              <input type="number" value={nutrition.fatG} onChange={(e) => setNutrition({ ...nutrition, fatG: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Вода, мл">
              <input type="number" value={nutrition.waterMl} onChange={(e) => setNutrition({ ...nutrition, waterMl: Number(e.target.value) })} className={inputCls} />
            </Field>
          </div>
        )}

        {tab === 'weight' && (
          <div className="mt-3.5 flex flex-col gap-3">
            <Field label="Вага, кг">
              <input type="number" step="0.1" value={weight.weightKg} onChange={(e) => setWeight({ ...weight, weightKg: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="% жиру в тілі (опційно)">
              <input type="number" step="0.1" value={weight.bodyFatPct} onChange={(e) => setWeight({ ...weight, bodyFatPct: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}

        {tab === 'mood' && (
          <div className="mt-3.5 flex flex-col gap-3">
            <Field label={`Настрій: ${mood.mood}/5`}>
              <input type="range" min={1} max={5} value={mood.mood} onChange={(e) => setMood({ ...mood, mood: Number(e.target.value) })} />
            </Field>
            <Field label={`Енергія: ${mood.energy}/5`}>
              <input type="range" min={1} max={5} value={mood.energy} onChange={(e) => setMood({ ...mood, energy: Number(e.target.value) })} />
            </Field>
            <Field label={`Стрес: ${mood.stress}/5`}>
              <input type="range" min={1} max={5} value={mood.stress} onChange={(e) => setMood({ ...mood, stress: Number(e.target.value) })} />
            </Field>
            <Field label="Нотатки (опційно)">
              <input type="text" value={mood.notes} onChange={(e) => setMood({ ...mood, notes: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-accent-strong px-4 py-2.5 text-[13.5px] font-semibold text-[#06281c] disabled:opacity-50"
        >
          {saving ? 'Збереження...' : 'Зберегти запис'}
        </button>
      </div>
    </section>
  );
}
