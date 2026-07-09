# Vitalyzer (Next.js + TypeScript + PostgreSQL + Google Auth + Stripe)

Vitalyzer — багатокористувацький SaaS: "розумний шар" над вашими даними сну/тренувань/харчування/ваги/настрою. Користувачі входять через Google, оформлюють підписку і отримують доступ до дашборду, який аналізує тренди й видає щоденну персональну пораду (локальний рушій за замовчуванням, опційно — Claude API). Повністю адаптивний інтерфейс — працює як на десктопі, так і з телефону.

## Стек

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js Route Handlers (`src/app/api/**`) — REST API на тому ж сервері
- **База даних**: PostgreSQL через Prisma ORM (multi-tenant — усі дані прив'язані до `userId`)
- **Автентифікація**: NextAuth.js, вхід через Google
- **Оплата**: Stripe Checkout + Billing Portal + webhooks; весь застосунок доступний лише за активною підпискою
- **AI (опційно)**: Anthropic Claude API (`@anthropic-ai/sdk`), викликається лише сервером

## Архітектура сторінок

- `/` — публічний лендінг (маркетинг, ціна, кнопка «Увійти через Google»). Доступний без входу.
- `/billing` — сторінка оформлення підписки (Stripe Checkout). Показується залогіненим користувачам без активної підписки.
- `/app/**` — сам застосунок (дашборд, швидкий запис, імпорт, тренди, історія, налаштування). Захищено на рівні серверного layout (`src/app/app/layout.tsx`): без сесії → редірект на `/`, без активної підписки → редірект на `/billing`.

## Швидкий старт (локальна розробка)

### 1. Піднімаємо PostgreSQL

```bash
docker compose up -d
```

Це підніме Postgres на `localhost:5432` з базою `vitalyzer` (логін/пароль `vitalyzer`/`vitalyzer`). Якщо не використовуєте Docker — встановіть PostgreSQL локально і відредагуйте `DATABASE_URL` у `.env`.

### 2. Налаштування середовища

```bash
cp .env.example .env
```

Заповніть змінні (детально — розділи нижче). `ANTHROPIC_API_KEY` можна лишити порожнім.

### 3. Встановлення залежностей і міграція БД

```bash
npm install
npx prisma migrate dev
```

### 4. Запуск

```bash
npm run dev
```

Застосунок буде на `http://localhost:3000`. Без налаштованих `GOOGLE_CLIENT_ID`/`STRIPE_*` побачите лендінг, але вхід і підписка не запрацюють — дивіться налаштування нижче.

## Налаштування Google OAuth (обов'язково для входу)

1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID** → тип **Web application**.
2. **Authorized redirect URI**: `http://localhost:3000/api/auth/callback/google` (для продакшну — `https://ваш-домен/api/auth/callback/google`).
3. Скопіюйте **Client ID** і **Client Secret** у `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
4. Згенеруйте `NEXTAUTH_SECRET`: `openssl rand -base64 32` (у `.env` вже є значення для локальної розробки — для продакшну згенеруйте нове).

## Налаштування Stripe (обов'язково для підписки)

1. [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) → скопіюйте **Secret key** → `STRIPE_SECRET_KEY`.
2. **Products → Add product** → створіть товар із періодичною ціною (наприклад, $4.99/місяць) → скопіюйте **Price ID** (`price_...`) → `STRIPE_PRICE_ID`.
3. Webhook:
   - Локально: `stripe listen --forward-to localhost:3000/api/stripe/webhook` — виведе webhook secret, вставте у `STRIPE_WEBHOOK_SECRET`.
   - Продакшн: [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → Add endpoint → URL `https://ваш-домен/api/stripe/webhook`, події: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. `NEXT_PUBLIC_SUBSCRIPTION_PRICE_LABEL` — просто текст ціни на лендінгу/сторінці підписки, косметичний, не впливає на реальне списання.

Без цих кроків кнопки «Увійти через Google» і «Оформити підписку» показуватимуть помилку — це очікувано, доки ключі не додані.

## Функціонал (`/app/**`)

- **Дашборд** — щоденна порада, оцінки по категоріях, графіки сну/тренувань/харчування/ваги/настрою за 14 днів.
- **Швидкий запис** — форми для ручного додавання сьогоднішніх (або будь-якої дати) показників сну, тренування, харчування, ваги чи настрою без підготовки CSV-файлу.
- **Імпорт даних** — масовий імпорт CSV/Excel з дедуплікацією та ручною перевіркою відповідності колонок.
- **Тренди** — серії (streaks): дні поспіль з дотриманою ціллю сну, дні активного трекінгу, дні з останнього тренування; порівняння цього тижня з минулим; графіки ваги та настрою за 30 днів.
- **Історія** — перегляд і видалення окремих записів чи цілих категорій.
- **Налаштування** — керування підпискою (Stripe Billing Portal), особисті цілі, опційний ключ Anthropic API, вихід з акаунту.

## Структура проєкту

```
prisma/schema.prisma          — модель БД: User/Account/Session (NextAuth) + SleepEntry/WorkoutEntry/NutritionEntry/WeightEntry/MoodEntry/Settings/AdviceCache (усі з userId)
docker-compose.yml             — локальний PostgreSQL для розробки
src/app/page.tsx                — публічний лендінг
src/app/billing/page.tsx        — сторінка оформлення підписки
src/app/app/                     — застосунок (дашборд, швидкий запис, імпорт, тренди, історія, налаштування), layout.tsx перевіряє сесію+підписку
src/app/api/auth/[...nextauth]   — NextAuth route handler
src/app/api/stripe/               — checkout, portal, webhook
src/app/api/                      — REST API даних: sleep, workouts, nutrition, weight, mood, settings, import, advice, backup, wipe (усі вимагають активну підписку)
src/lib/auth.ts                    — конфігурація NextAuth (Google provider + Prisma adapter)
src/lib/auth-helpers.ts             — requireSubscribedUser() — єдина точка перевірки сесії+підписки для API
src/lib/stripe.ts                    — Stripe SDK клієнт
src/lib/parser.ts                     — читання CSV/Excel у браузері, автовизначення типу й полів
src/lib/insights.ts                    — серверний аналітичний рушій: тренди, оцінки, правила-поради
src/lib/ai.ts                           — опційна інтеграція з Claude API
src/components/Sidebar.tsx               — навігація застосунку, адаптивна (гамбургер-меню на мобільних)
```

## AI-аналіз (опційно)

За замовчуванням поради генерує локальний аналітичний рушій (`src/lib/insights.ts`). Якщо додати ключ Anthropic API (через Налаштування в застосунку, або `ANTHROPIC_API_KEY` в `.env`), сервер надсилатиме агреговану статистику до Claude і повертатиме персоналізовану пораду природною мовою.

## API (для довідки)

Усі ендпоінти даних вимагають активну сесію NextAuth **і** активну підписку (перевіряється через `requireSubscribedUser()`), інакше повертають `401`/`402`:

- `GET/DELETE /api/sleep`, `/api/workouts`, `/api/nutrition`, `/api/weight`, `/api/mood` — список і масове очищення категорії (`?all=true`)
- `DELETE /api/*/:id` — видалення одного запису
- `POST /api/import` — імпорт масиву записів (`{ type, records }`), upsert з дедуплікацією; той самий ендпоінт використовує «Швидкий запис»
- `GET /api/advice?force=true` — щоденна порада (кешується на день)
- `GET/PUT /api/settings`, `PUT/DELETE /api/settings/api-key`
- `GET /api/backup`, `POST /api/wipe`
- `POST /api/stripe/checkout` — створює Stripe Checkout Session (потрібна лише сесія, без підписки — інакше нікуди підписуватись)
- `POST /api/stripe/portal` — посилання на Stripe Billing Portal
- `POST /api/stripe/webhook` — синхронізація статусу підписки зі Stripe

## Продакшн-збірка

```bash
npm run build
npm run start
```

Перед деплоєм: `npx prisma migrate deploy` на продакшн-базі, реальні `GOOGLE_CLIENT_ID/SECRET` з redirect URI на продакшн-домен, реальний `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`/`STRIPE_WEBHOOK_SECRET`, новий `NEXTAUTH_SECRET`, `NEXTAUTH_URL` = продакшн-домен.
