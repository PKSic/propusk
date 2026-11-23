# Attendance Manager — ВЕБ-32К

Веб-приложение для учёта посещаемости студентов учебной группы **ВЕБ-32К**, регистрации пропусков и автоматического расчёта пропущенных академических часов.

## Технологический стек

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Node.js, TypeScript, Express.js, Prisma ORM, Zod
- **Database:** PostgreSQL 16

## Структура проекта

```text
attendance-manager/
├── backend/
│   ├── prisma/
│   │   ├── migrations/20261123000000_init/migration.sql
│   │   └── schema.prisma
│   ├── src/
│   │   ├── lib/prisma.ts
│   │   ├── middleware/errorHandler.ts
│   │   ├── routes/          # students, subjects, lessons, attendance, statistics
│   │   ├── services/        # attendanceCalculator, statisticsService
│   │   ├── utils/dateRange.ts
│   │   └── index.ts
│   ├── tests/statistics.test.mjs
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/client.ts
│   │   ├── components/      # Layout, ConfirmModal, ToastContext
│   │   ├── pages/           # Dashboard, Attendance, Students, StudentDetail, Subjects, LessonsHistory
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .env.example
├── docker-compose.yml
└── package.json
```

## Правила расчёта пропусков

- **Присутствовал (`PRESENT`)** — `0` часов
- **Половина пары (`HALF_ABSENT`)** — `1` час
- **Отсутствовал (`ABSENT`)** — `2` часа
- **Не отмечен (`UNMARKED`)** — `0` часов, не считается отсутствием и не участвует в проценте посещаемости
- **Неделя** рассчитывается строго с **понедельника по воскресенье**

## Инструкция по запуску

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env` (и в `backend/.env`, если запускаете команды из папки `backend`) и задайте надёжный пароль для PostgreSQL:

```bash
cp .env.example .env
cp .env.example backend/.env
```

### 2. Установка зависимостей

```bash
npm run install:all
```

### 3. Запуск PostgreSQL через Docker

```bash
docker compose up -d
```

### 4. Применение миграций Prisma

```bash
npm run db:generate
npm run db:migrate:deploy
```

### 5. Запуск в режиме разработки

В первом терминале (Backend на `http://localhost:4000`):

```bash
npm run dev:backend
```

Во втором терминале (Frontend на `http://localhost:5173`):

```bash
npm run dev:frontend
```

### 6. Сборка production-версии

```bash
npm run build
```

Для запуска собранного Backend:

```bash
npm --prefix backend run start
```

### 7. Запуск тестов расчёта посещаемости (12 сценариев)

```bash
npm test
```
