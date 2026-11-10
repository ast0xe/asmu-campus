# Campus

Стартовый проект студенческого портала: Next.js static export + Supabase + GitHub Pages.

## 1. Что уже подготовлено

- Структура Next.js + TypeScript.
- Статическая сборка под `https://username.github.io/Campus`.
- GitHub Actions для автоматической публикации из ветки `main`.
- Страницы входа и регистрации через Supabase Auth.
- Каркас личного кабинета, расписания, библиотеки и заданий.
- Начальная схема PostgreSQL с группами, профилями, дисциплинами, расписанием, материалами, заданиями и прогрессом.
- Базовые политики Row Level Security (RLS).

Разделы расписания, библиотеки и заданий пока являются каркасами, а не завершёнными функциями.

## 2. Локальный запуск

Требуется Node.js 22 и npm.

```bash
npm install
cp .env.example .env.local
```

Заполните `.env.local` значениями проекта Supabase, затем:

```bash
npm run dev
```

Откройте `http://localhost:3000`.

## 3. Настройка Supabase

1. Создайте проект в Supabase.
2. Откройте SQL Editor.
3. Выполните файл `supabase/migrations/001_initial_schema.sql`.
4. В Project Settings → API скопируйте Project URL и anon/public key.
5. Запишите их в `.env.local`.
6. В Authentication → URL Configuration добавьте адрес сайта в Site URL / Redirect URLs после публикации.

**Важно:** в браузер можно помещать только anon/public key. Никогда не добавляйте `service_role` key в `.env.local` с префиксом `NEXT_PUBLIC_` или в клиентский код.

## 4. Создание GitHub-репозитория

1. На GitHub создайте пустой репозиторий с именем `Campus`.
2. Распакуйте архив проекта.
3. В корне проекта выполните:

```bash
git init
git add .
git commit -m "Initial Campus portal"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/Campus.git
git push -u origin main
```

## 5. Включение GitHub Pages

1. Откройте Settings → Pages репозитория.
2. В разделе Build and deployment выберите **GitHub Actions**.
3. Откройте Settings → Secrets and variables → Actions.
4. Создайте secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. После push в `main` workflow соберёт сайт и опубликует его.

Адрес будет `https://ВАШ_ЛОГИН.github.io/Campus/`.

## 6. Первый администратор

Регистрация всегда создаёт пользователя с ролью `student`. Чтобы назначить администратора, после регистрации выполните в Supabase SQL Editor запрос, подставив UUID пользователя из Authentication → Users:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_ПОЛЬЗОВАТЕЛЯ';
```

Не добавляйте публичную регистрацию администраторов и не позволяйте клиенту самостоятельно менять поле `role`.

## 7. Ограничения GitHub Pages

GitHub Pages отдаёт статические файлы и не запускает Node.js сервер. Поэтому в этом проекте нельзя использовать Next.js Server Actions, API Routes, middleware или серверный рендеринг. Защищённые операции будут реализовываться через Supabase Edge Functions и SQL RPC с проверкой JWT и роли пользователя. RLS остаётся обязательным уровнем защиты данных.

## 8. Следующие этапы

1. Выбор учебной группы в профиле и полноценная проверка сессии на всех страницах.
2. Расписание: день/неделя/месяц, тип недели, отмены и замены.
3. Библиотека: дисциплины, темы, файлы, поиск, избранное и отметка прочитанного.
4. Задания: сроки и личные статусы.
5. Админ-панель и безопасный импорт CSV/XLSX с предпросмотром, проверкой и журналом операций.
