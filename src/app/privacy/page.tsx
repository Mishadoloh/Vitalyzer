import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Політика конфіденційності',
  description: 'Як Metrivyn обробляє та захищає дані користувачів.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-12 text-text sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-accent hover:underline">← Metrivyn</Link>
        <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Політика конфіденційності</h1>
        <p className="mt-3 text-sm text-text-muted">Оновлено 20 липня 2026 року</p>

        <div className="mt-10 space-y-9 text-[15px] leading-7 text-text-muted">
          <section>
            <h2 className="text-xl font-semibold text-text">Які дані ми обробляємо</h2>
            <p className="mt-2">Після входу через Google Metrivyn отримує базові дані профілю: ім’я, email та фото. Застосунок також зберігає записи, які ви додаєте або імпортуєте: сон, тренування, харчування, вагу, настрій, цілі, звички та приватні фото прогресу.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Навіщо потрібні дані</h2>
            <p className="mt-2">Дані використовуються для входу, синхронізації між пристроями, побудови трендів, формування персональних висновків, резервних копій та функцій, які ви явно вмикаєте.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Зберігання та захист</h2>
            <p className="mt-2">Акаунти й записи зберігаються у захищеній хмарній базі даних. Секрети OAuth не передаються у браузер і не зберігаються в репозиторії. Ми не продаємо персональні дані користувачів.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Ваш контроль</h2>
            <p className="mt-2">У налаштуваннях можна експортувати дані, скинути застосунок і видалити записи. Доступ Metrivyn до Google-акаунта можна відкликати у налаштуваннях безпеки Google.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Зв’язок</h2>
            <p className="mt-2">Питання щодо конфіденційності можна надіслати через <a className="text-accent hover:underline" href="https://github.com/Mishadoloh/Metrivyn/issues">репозиторій Metrivyn</a>.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
