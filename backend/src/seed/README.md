# Seed local de cursos

`courses.json` e a fonte única de verdade do catálogo local. Edite os campos de
curso, capítulos e aulas nesse arquivo e execute, a partir de `backend/`:

```powershell
npm.cmd run seed:courses
```

O comando exige `APP_ENV=development` ou `test` e um Firestore acessível
(credenciais da service account em `GOOGLE_APPLICATION_CREDENTIALS` ou
`FIREBASE_SERVICE_ACCOUNT`, ou emulador em `FIRESTORE_EMULATOR_HOST`).
Ele limpa e recria integralmente os documentos de `courses`, `chapters` e
`lessons` (ids determinísticos: `{courseSlug}`,
`{courseSlug}:{chapterSlug}` e `{chapterId}:{ordem}`); não altera `users`
nem demais coleções de autenticação.
