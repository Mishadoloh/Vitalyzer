'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, CalendarDays, Dumbbell, Moon, Save, Scale, Smile, Utensils, type LucideIcon } from 'lucide-react';
import { showToast } from '@/lib/toast';
import type { EntryType } from '@/lib/types';

const TABS: { key: EntryType; label: string; hint: string; icon: LucideIcon }[] = [
  { key: 'sleep', label: 'Сон', hint: 'години та якість', icon: Moon },
  { key: 'workouts', label: 'Тренування', hint: 'тип і хвилини', icon: Dumbbell },
  { key: 'nutrition', label: 'Харчування', hint: 'ккал і макро', icon: Utensils },
  { key: 'weight', label: 'Вага', hint: 'контроль прогресу', icon: Scale },
  { key: 'mood', label: 'Настрій', hint: 'енергія і стрес', icon: Smile },
];

const inputCls = 'rounded-xl border border-border bg-bg-elevated px-3 py-3 text-sm text-text outline-none focus:border-accent';

function todayISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-muted">
      <span className="flex items-center justify-between gap-2">
        {label}
        {hint && <span className="text-[11px] opacity-75">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent">
      {children}
    </button>
  );
}

export default function QuickAddPage() {
  const [tab, setTab] = useState<EntryType>('sleep');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [sleep, setSleep] = useState({ hours: 7.5, quality: 4, bedtime: '', wakeTime: '' });
  const [workout, setWorkout] = useState({ type: 'Біг', durationMin: 30, calories: '', avgHR: '', distanceKm: '' });
  const [nutrition, setNutrition] = useState({ calories: 2000, proteinG: 100, carbsG: 220, fatG: 70, waterMl: 2000 });
  const [weight, setWeight] = useState({ weightKg: 75, bodyFatPct: '' });
  const [mood, setMood] = useState({ mood: 3, energy: 3, stress: 3, notes: '' });

  const activeTab = TABS.find((item) => item.key === tab) || TABS[0];
  const ActiveIcon = activeTab.icon;

  async function submit(redirectToDashboard: boolean) {
    let record: Record<string, unknown>;

    if (tab === 'sleep') {
      record = { date, hours: sleep.hours, quality: sleep.quality || null, bedtime: sleep.bedtime || null, wakeTime: sleep.wakeTime || null };
    } else if (tab === 'workouts') {
      record = {
        date,
        type: workout.type || 'Тренування',
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
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: tab, records: [record] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Помилка збереження');
      showToast(`Збережено: ${activeTab.label} за ${date}`);
      if (redirectToDashboard) {
        router.push('/app');
      }
    } catch (e) {
      showToast('Не вдалося зберегти запис: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pb-8">
      <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,0.98),rgba(14,18,23,0.98))] shadow-xl shadow-black/20">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
              <Save size={13} />
              запис вручну
            </span>
            <h1 className="m-0 text-2xl font-bold text-text">Швидкий запис</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Додайте сьогоднішні показники без імпорту файлів. Повторний запис за ту саму дату оновить день, а тренування додасться окремим рядком.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-bg/30 p-3 sm:min-w-[240px]">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <CalendarDays size={14} className="text-accent" />
              Поточна дата
            </div>
            <div className="mt-1 text-lg font-bold text-text">{date}</div>
            <div className="mt-3 flex gap-2">
              <Chip onClick={() => setDate(todayISO())}>сьогодні</Chip>
              <Chip onClick={() => setDate(addDays(date, -1))}>-1 день</Chip>
              <Chip onClick={() => setDate(addDays(date, 1))}>+1 день</Chip>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                active ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-muted hover:border-accent/50 hover:text-text'
              }`}
            >
              <Icon size={17} className="mb-2" />
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="mt-0.5 text-[11px] opacity-80">{item.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,680px)_1fr]">
        <div className="rounded-3xl border border-border bg-bg-card p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ActiveIcon size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-text">{activeTab.label}</h2>
              <p className="text-xs text-text-muted">Запис за {date}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Дата">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputCls} />
            </Field>

            {tab === 'sleep' && (
              <>
                <Field label="Години сну">
                  <input type="number" step="0.1" value={sleep.hours} onChange={(event) => setSleep({ ...sleep, hours: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="Якість сну" hint={`${sleep.quality}/5`}>
                  <input type="range" min={1} max={5} step={0.5} value={sleep.quality} onChange={(event) => setSleep({ ...sleep, quality: Number(event.target.value) })} />
                </Field>
                <Field label="Час сну">
                  <input type="time" value={sleep.bedtime} onChange={(event) => setSleep({ ...sleep, bedtime: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Пробудження">
                  <input type="time" value={sleep.wakeTime} onChange={(event) => setSleep({ ...sleep, wakeTime: event.target.value })} className={inputCls} />
                </Field>
              </>
            )}

            {tab === 'workouts' && (
              <>
                <Field label="Тип тренування">
                  <input type="text" value={workout.type} onChange={(event) => setWorkout({ ...workout, type: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Тривалість, хв">
                  <input type="number" value={workout.durationMin} onChange={(event) => setWorkout({ ...workout, durationMin: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="Калорії" hint="опційно">
                  <input type="number" value={workout.calories} onChange={(event) => setWorkout({ ...workout, calories: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Середній пульс" hint="опційно">
                  <input type="number" value={workout.avgHR} onChange={(event) => setWorkout({ ...workout, avgHR: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Дистанція, км" hint="опційно">
                  <input type="number" step="0.1" value={workout.distanceKm} onChange={(event) => setWorkout({ ...workout, distanceKm: event.target.value })} className={inputCls} />
                </Field>
              </>
            )}

            {tab === 'nutrition' && (
              <>
                <Field label="Калорії">
                  <input type="number" value={nutrition.calories} onChange={(event) => setNutrition({ ...nutrition, calories: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="Білок, г">
                  <input type="number" value={nutrition.proteinG} onChange={(event) => setNutrition({ ...nutrition, proteinG: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="Вуглеводи, г">
                  <input type="number" value={nutrition.carbsG} onChange={(event) => setNutrition({ ...nutrition, carbsG: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="Жири, г">
                  <input type="number" value={nutrition.fatG} onChange={(event) => setNutrition({ ...nutrition, fatG: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="Вода, мл">
                  <input type="number" value={nutrition.waterMl} onChange={(event) => setNutrition({ ...nutrition, waterMl: Number(event.target.value) })} className={inputCls} />
                </Field>
              </>
            )}

            {tab === 'weight' && (
              <>
                <Field label="Вага, кг">
                  <input type="number" step="0.1" value={weight.weightKg} onChange={(event) => setWeight({ ...weight, weightKg: Number(event.target.value) })} className={inputCls} />
                </Field>
                <Field label="% жиру" hint="опційно">
                  <input type="number" step="0.1" value={weight.bodyFatPct} onChange={(event) => setWeight({ ...weight, bodyFatPct: event.target.value })} className={inputCls} />
                </Field>
              </>
            )}

            {tab === 'mood' && (
              <>
                <Field label="Настрій" hint={`${mood.mood}/5`}>
                  <input type="range" min={1} max={5} value={mood.mood} onChange={(event) => setMood({ ...mood, mood: Number(event.target.value) })} />
                </Field>
                <Field label="Енергія" hint={`${mood.energy}/5`}>
                  <input type="range" min={1} max={5} value={mood.energy} onChange={(event) => setMood({ ...mood, energy: Number(event.target.value) })} />
                </Field>
                <Field label="Стрес" hint={`${mood.stress}/5`}>
                  <input type="range" min={1} max={5} value={mood.stress} onChange={(event) => setMood({ ...mood, stress: Number(event.target.value) })} />
                </Field>
                <Field label="Нотатки" hint="опційно">
                  <input type="text" value={mood.notes} onChange={(event) => setMood({ ...mood, notes: event.target.value })} className={inputCls} />
                </Field>
              </>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => submit(false)}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Збереження...' : 'Зберегти і додати ще'}
            </button>
            <button
              onClick={() => submit(true)}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent-strong px-4 py-3 text-sm font-semibold text-[#06281c] disabled:opacity-50"
            >
              <ArrowRight size={16} />
              {saving ? 'Збереження...' : 'Зберегти і на дашборд'}
            </button>
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-bg-card p-4 shadow-xl shadow-black/10">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <Activity size={15} className="text-accent" />
            Швидкі пресети
          </div>
          <div className="flex flex-wrap gap-2">
            {tab === 'sleep' && (
              <>
                <Chip onClick={() => setSleep({ ...sleep, hours: 7.5, quality: 4 })}>нормальний сон</Chip>
                <Chip onClick={() => setSleep({ ...sleep, hours: 6, quality: 2.5 })}>мало сну</Chip>
                <Chip onClick={() => setSleep({ ...sleep, hours: 8.5, quality: 5 })}>супер сон</Chip>
              </>
            )}
            {tab === 'workouts' && (
              <>
                <Chip onClick={() => setWorkout({ ...workout, type: 'Біг', durationMin: 35 })}>біг 35 хв</Chip>
                <Chip onClick={() => setWorkout({ ...workout, type: 'Силове', durationMin: 50 })}>силове 50 хв</Chip>
                <Chip onClick={() => setWorkout({ ...workout, type: 'Ходьба', durationMin: 45 })}>ходьба</Chip>
              </>
            )}
            {tab === 'nutrition' && (
              <>
                <Chip onClick={() => setNutrition({ ...nutrition, calories: 1800, proteinG: 120 })}>дефіцит</Chip>
                <Chip onClick={() => setNutrition({ ...nutrition, calories: 2200, proteinG: 130 })}>баланс</Chip>
                <Chip onClick={() => setNutrition({ ...nutrition, calories: 2600, proteinG: 150 })}>набір</Chip>
              </>
            )}
            {tab === 'weight' && (
              <>
                <Chip onClick={() => setWeight({ ...weight, weightKg: Math.round((weight.weightKg - 0.1) * 10) / 10 })}>-0.1 кг</Chip>
                <Chip onClick={() => setWeight({ ...weight, weightKg: Math.round((weight.weightKg + 0.1) * 10) / 10 })}>+0.1 кг</Chip>
              </>
            )}
            {tab === 'mood' && (
              <>
                <Chip onClick={() => setMood({ ...mood, mood: 4, energy: 4, stress: 2 })}>добрий день</Chip>
                <Chip onClick={() => setMood({ ...mood, mood: 3, energy: 3, stress: 3 })}>звичайний</Chip>
                <Chip onClick={() => setMood({ ...mood, mood: 2, energy: 2, stress: 4 })}>важкий день</Chip>
              </>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-text-muted">
            Пресети лише заповнюють поля. Перед збереженням можна змінити будь-яке значення вручну.
          </p>
          <div className="mt-4 rounded-2xl border border-border bg-bg-elevated p-3">
            <div className="text-xs text-text-muted">Поточний розділ</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-text">
              <ActiveIcon size={15} className="text-accent" />
              {activeTab.label}
            </div>
            <div className="mt-2 text-xs leading-5 text-text-muted">
              Після збереження можна залишитись тут і швидко додати наступний тип даних.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
