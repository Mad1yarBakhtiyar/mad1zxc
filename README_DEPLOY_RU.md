# SKAS — демо без базы данных

Сайт работает полностью в браузере, без Python, Neon или API. Данные временные и сбрасываются после обновления страницы.

## Vercel
1. Загрузите **содержимое этой папки** в новый репозиторий GitHub (файлы `package.json`, `index.html`, `vercel.json` и папку `src`).
2. В Vercel выберите Add New → Project → Import repository.
3. Root Directory: `./`; Framework: Vite; Build Command: `npm run build`; Output Directory: `dist`.
4. Environment Variables не нужны. Нажмите Deploy.

Демо-аккаунты: `student@skas.kz` и `teacher@skas.kz`, пароль `Skas2026!`.

**Внимание:** это учебная демонстрация. Авторизация ненастоящая, данные и результаты не хранятся на сервере, разные посетители не видят изменения друг друга.
