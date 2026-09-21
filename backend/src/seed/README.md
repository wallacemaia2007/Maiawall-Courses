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

## Trechos de código nas aulas

O campo `content` de uma aula aceita trechos de código entre três crases, como
no Markdown. Eles aparecem no frontend dentro de uma janela de terminal, com
botão de copiar; o texto fora das crases segue normal.

```json
"content": "Inicie o repositório:\n```bash\ngit init\ngit status\n```\nDepois faça o primeiro commit."
```

Na linha de abertura vai a linguagem e, opcionalmente, um título:
`` ```yaml compose.yaml ``.

- `bash`, `sh`, `zsh`, `shell`, `terminal`, `console`: cada linha ganha o prompt
  `$`; linhas iniciadas com `#` viram comentário. Se alguma linha começar com
  `$ `, só essas são comandos e as demais são exibidas como saída.
- `powershell` e `cmd`: mesmo comportamento, com prompt `>`.
- Qualquer outra linguagem (`yaml`, `json`, `http`, `ts`...): janela de código
  sem prompt.

Após editar o JSON, rode o seed de novo para atualizar o Firestore.
