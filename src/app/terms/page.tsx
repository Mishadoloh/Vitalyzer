import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Умови використання',
  description: 'Умови використання застосунку Metrivyn.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-12 text-text sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-accent hover:underline">← Metrivyn</Link>
        <h1 className="mt-8 text-3xl font-bold sm:text-4xl">Умови використання</h1>
        <p className="mt-3 text-sm text-text-muted">Оновлено 20 липня 2026 року</p>

        <div className="mt-10 space-y-9 text-[15px] leading-7 text-text-muted">
          <section>
            <h2 className="text-xl font-semibold text-text">Призначення сервісу</h2>
            <p className="mt-2">Metrivyn допомагає організовувати особисті показники здоров’я, бачити тенденції та формувати щоденні звички. Сервіс не є медичним виробом і не замінює консультацію лікаря.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Акаунт</h2>
            <p className="mt-2">Користувач відповідає за безпеку свого Google-акаунта та точність внесених даних. Гостьовий режим призначений для ознайомлення; для стабільної синхронізації потрібен постійний акаунт.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Допустиме використання</h2>
            <p className="mt-2">Заборонено намагатися отримати доступ до чужих даних, обходити обмеження безпеки, перевантажувати сервіс автоматизованими запитами або використовувати його для незаконної діяльності.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Доступність і зміни</h2>
            <p className="mt-2">Ми прагнемо підтримувати сервіс доступним, але не гарантуємо безперервну роботу. Функції та умови можуть оновлюватися; дата останньої редакції завжди вказується на цій сторінці.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text">Припинення використання</h2>
            <p className="mt-2">Користувач може експортувати свої дані та припинити використання сервісу в будь-який момент. Записи можна видалити через налаштування застосунку.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
