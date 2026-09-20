# Seed local de cursos

`courses.json` e a fonte única de verdade do catálogo local. Edite os campos de
curso, capítulos e aulas nesse arquivo e execute, a partir de `backend/`:

```powershell
npm.cmd run seed:courses
```

O comando exige `APP_ENV=development` ou `test` e um `MONGODB_URI` apontando
somente para `localhost`, `127.0.0.1`, `::1` ou `mongo` (Docker Compose).
Ele limpa e recria integralmente as coleções `courses`, `chapters` e `lessons`;
não altera `users` nem demais coleções de autenticação.
