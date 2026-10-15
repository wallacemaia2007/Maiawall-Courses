# Seed local de cursos

O catálogo local é dividido em um JSON por curso, dentro de `backend/src/seed/`:

- `apis-metodos-http-e-json.json`
- `git-para-iniciantes.json`
- `docker-containerizacao-na-pratica.json`

Edite os campos de curso, capítulos e aulas nesses arquivos e execute, a partir
de `backend/`:

```powershell
npm.cmd run seed:courses
```

O comando exige `APP_ENV=development` ou `test` e um Firestore acessível
(credenciais da service account em `GOOGLE_APPLICATION_CREDENTIALS` ou
`FIREBASE_SERVICE_ACCOUNT`, ou emulador em `FIRESTORE_EMULATOR_HOST`).
Ele limpa e recria integralmente os documentos de `courses` e `chapters`
(ids determinísticos: `{courseSlug}` e `{courseSlug}:{chapterSlug}`); não altera
`users` nem demais coleções de autenticação.

A coleção `lessons` não é mais escrita — o corpo das aulas vive nos JSONs deste
diretório e nos assets estáticos gerados a partir deles. O seed apenas **apaga**
os documentos antigos dela (marcados com `seedSource = local-course-catalog`),
que sobraram de versões anteriores do script.

## `published` é obrigatório

Todo curso precisa de `published: true` ou `published: false`, explicitamente.
O motivo é o mesmo dos dois lados: o asset do conteúdo é servido publicamente,
sem passar pela API, então o controle de publicação acontece no build e não em
tempo de leitura. Campo ausente faz o `npm run content:build` **falhar** com o
nome do curso (não pode ser assumido como publicado — vazaria o conteúdo de um
curso fora do catálogo — nem como privado, que sumiria o capítulo do ar sem
aviso). Use `published: false` para despublicar: o build deixa de gerar o JSON
e apaga o anterior.

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

Depois de editar o JSON do curso, rode o seed de novo para atualizar o Firestore
**e** `npm run content:build` para regerar o asset — são dois consumidores
independentes do mesmo arquivo, e o `prebuild`/`prestart` só cuida do segundo.
O loader `course-catalog.js` combina os três JSONs em um único catálogo.
