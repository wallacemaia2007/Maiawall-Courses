# Maiawall Cursos

Plataforma de cursos online da Maiawall, criada para reunir cursos, aulas,
exercicios e acompanhamento da jornada de aprendizagem em um unico lugar.

O projeto esta em desenvolvimento e combina uma experiencia publica para
descoberta dos cursos com uma area autenticada para alunos e uma area
administrativa para gerenciamento do conteudo.

## Sobre o projeto

O Maiawall Cursos foi pensado para funcionar como um acervo de conhecimento e,
ao mesmo tempo, como uma plataforma completa de aprendizagem. A aplicacao
organiza o conteudo por cursos, capitulos e aulas, permitindo que o aluno avance
de forma estruturada e acompanhe seu progresso.

### O que existe no projeto

- Pagina inicial publica com apresentacao da plataforma e seus cursos.
- Catalogo publico de cursos com URLs amigaveis baseadas em `slug`.
- Paginas de detalhes, capitulos e aulas publicas.
- Cadastro, login, recuperacao de senha e verificacao de email.
- Login social opcional com GitHub e Google.
- Area do aluno com dashboard, cursos, progresso, exercicios e submissoes.
- Perfil do aluno e troca de senha.
- Emissao e validacao publica de certificados.
- Painel administrativo para cursos, capitulos, exercicios, alunos, submissoes
  e certificados.
- API propria para autenticacao, catalogo, aprendizagem e usuarios.
- Persistencia dos dados no Firebase Firestore.
- Seeds para carregar o catalogo local de cursos.

## Preview

Adicione aqui uma captura de tela atualizada do hero da pagina inicial:

```md
![Hero da pagina inicial](docs/images/hero-home.png)
```

Enquanto a captura oficial nao e adicionada, este banner existente pode ser
usado como referencia visual:

![Banner de referencia](public/assets/banners/ufu.api.webp)

> Para incluir uma nova imagem no README, salve o arquivo em `docs/images/` e
> atualize o caminho acima. Uma captura do hero em desktop e outra em mobile
> ajudam a documentar melhor a experiencia da plataforma.

## Experiencia da aplicacao

### Area publica

Visitantes podem conhecer a plataforma, navegar pelo catalogo, abrir um curso,
consultar capitulos e validar certificados sem precisar entrar na conta.

### Area do aluno

Alunos autenticados acessam seus cursos, aulas, exercicios, respostas,
submissoes, progresso e certificados. O acesso e protegido por autenticacao e
guards de rota.

### Area administrativa

Usuarios administradores acessam o painel em `/admin`, com as paginas:

- `/admin/dashboard`: metricas da plataforma (alunos, cursos, progresso,
  duvidas sem resposta, leads e cursos mais engajados), alem de uma secao
  com a visao geral do Google Analytics (GA4), quando configurado.
- `/admin/leads`: leads registrados manualmente a partir do analytics (origem,
  meio, campanha, status), com resumo, filtro por status e a visao de trafego
  do site (GA4) como referencia ao cadastrar um lead.
- `/admin/cursos`: todos os cursos, publicados ou em rascunho.
- `/admin/acessos`: quem pode entrar no painel. Concede acesso por e-mail a uma
  conta ja existente e com e-mail verificado; acessos vindos de `ADMIN_EMAILS`
  aparecem como somente leitura.
- `/admin/alunos`: quem ja entrou na plataforma, com ultimo acesso e progresso.
- `/admin/duvidas`: duvidas enviadas nos minicursos, para responder e publicar
  no FAQ.

Os dados vem de
`GET /api/admin/{dashboard,analytics,courses,students,access,leads}`, todos
protegidos por `requireAuth` + `requireAdmin`. O ultimo login e gravado em
`users.lastLoginAt` (login, cadastro e OAuth; renovar o token nao conta).

`GET /api/admin/analytics` traz a visao geral do Google Analytics (GA4):
usuarios ativos agora, sessoes e usuarios dos ultimos 30 dias, a tendencia de
sessoes dos ultimos 14 dias e as principais origens/paginas. E opcional — sem
`GA4_PROPERTY_ID` no backend, a rota responde `{ configured: false }` e o
painel esconde essa secao; se a consulta ao GA4 falhar, responde
`{ configured: true, error: "..." }` sem derrubar o dashboard. A resposta e
cacheada em memoria por 5 minutos para nao estourar a cota da API do GA4.

## Stack

### Frontend

- Angular 19 com standalone components e TypeScript strict.
- Angular Router com carregamento por feature.
- RxJS para fluxos de dados e signals para estado reativo de sessao.
- Reactive Forms para formularios de autenticacao e gerenciamento.
- SCSS, Tailwind CSS e design tokens em `src/styles.scss`.
- GSAP para animacoes da interface.

### Backend

- Node.js com Express.
- JWT para access tokens e refresh tokens.
- bcryptjs para hash de senhas.
- Firebase Admin para acesso ao Firestore.
- Helmet, CORS e middleware de tratamento de erros.
- OAuth 2.0 com GitHub e Google, quando configurado.

### Ferramentas

- Angular CLI 19.
- ESLint com flat config.
- Prettier.
- Jasmine/Karma para testes do frontend.
- `node:test` para testes do backend.

## Arquitetura

O repositorio e dividido em duas aplicacoes relacionadas:

```text
src/                    # Frontend Angular
  app/
    core/               # Auth, guards, interceptors, modelos e servicos globais
    features/           # Home, auth, cursos, aluno, exercicios, certificados etc.
    layouts/            # Layout publico, autenticacao e area logada
    shared/             # Componentes, diretivas, pipes e utilitarios reutilizaveis
backend/                # API Node.js/Express
  src/
    config/             # Ambiente e conexao com Firebase
    middleware/         # Autenticacao e tratamento de erros
    repositories/       # Acesso aos dados
    routes/              # Rotas HTTP
    services/            # Autenticacao e OAuth
    scripts/             # Seeds do catalogo
    seed/                # Dados e instrucoes do seed
public/assets/          # Logos, icones e banners da aplicacao
docs/                   # Documentacao funcional e tecnica
```

### Principios principais

- `core` concentra infraestrutura compartilhada e nao depende de `features`.
- `shared` concentra componentes e utilitarios de apresentacao reutilizaveis.
- Features sao organizadas por dominio e podem usar `core` e `shared`.
- A autenticacao usa servicos, guards e interceptors funcionais.
- O estado da sessao usa signals; servicos de dominio trabalham com Observables.
- O frontend consome a API por `/api`; em desenvolvimento, o proxy aponta para
  `http://localhost:3000`.
- Respostas da API seguem o envelope `ApiResponse<T>`.

## Rotas principais

```text
/                         Inicio publico
/cursos                   Catalogo de cursos
/cursos/:slug             Detalhe do curso
/cursos/:slug/capitulo/... Aula publica
/certificados/:code       Validacao publica de certificado
/login                    Login
/signup                   Cadastro
/app/...                  Area autenticada do aluno
/admin/...                Area administrativa
```

O catalogo publico usa `slug` nas URLs. As areas autenticadas usam `id` para
identificar os recursos.

## Como executar

### Pre-requisitos

- Node.js LTS e npm.
- Um projeto Firebase com Firestore ou um emulador local.
- Credenciais do Firebase Admin para executar a API.

### Instalar dependencias

Na raiz do projeto:

```powershell
npm install
npm --prefix backend install
```

### Configurar o backend

Crie `backend/.env` para desenvolvimento:

```env
APP_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:4200
FIREBASE_PROJECT_ID=seu-projeto
GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\para\service-account.json
JWT_SECRET=troque-este-segredo
JWT_REFRESH_SECRET=troque-este-outro-segredo
```

O arquivo de credenciais tambem pode ser substituido por
`FIREBASE_SERVICE_ACCOUNT`. Para usar o emulador, defina
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.

Para ativar a secao de analytics do painel admin (opcional), adicione:

```env
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT={"type":"service_account", ...}
```

`GA4_PROPERTY_ID` e o ID numerico da propriedade GA4 (Administrador > Detalhes
da propriedade no Google Analytics). `GA4_SERVICE_ACCOUNT` e opcional: sem ele,
o backend usa `GOOGLE_APPLICATION_CREDENTIALS` (Application Default
Credentials) — funciona reaproveitando a mesma service account do Firebase,
desde que ela tenha acesso de leitor na propriedade GA4 (Administrador >
Acesso a propriedade, no Google Analytics).

### Iniciar o ambiente

Para iniciar frontend e backend juntos:

```powershell
npm run dev
```

O frontend fica em `http://localhost:4200`, a API em `http://localhost:3000` e
`GET /api/health` verifica a saude da API.

Para executar separadamente:

```powershell
npm start
npm --prefix backend run dev
```

## Comandos uteis

| Comando | Descricao |
| --- | --- |
| `npm run dev` | Inicia frontend e backend juntos |
| `npm run build` | Gera o build de producao do frontend |
| `npm test` | Executa os testes Angular |
| `npm run lint` | Executa o ESLint |
| `npm run format` | Formata os arquivos com Prettier |
| `npm --prefix backend test` | Executa os testes da API |
| `npm --prefix backend run seed:courses` | Recria cursos/capitulos (metadado) no Firestore |
| `npm run content:build` | Gera o conteudo estatico das aulas em `public/assets/courses/content/` |
| `npm run kill:ports` | Libera as portas locais no Windows |

O seed usa os JSONs de `backend/src/seed/` (um arquivo por curso, combinados
pelo `course-catalog.js`) como fonte do catalogo e recria as
colecoes `courses`/`chapters` no Firestore (metadado: titulo, slug, ordem e a
contagem de aulas) sem alterar os usuarios. A colecao `lessons` nao e mais
escrita: o corpo das aulas vive so nos JSONs e nos assets estaticos. O seed
continua apagando os documentos antigos de `lessons` marcados com
`seedSource = local-course-catalog`, entao ** rode o seed uma vez apos aplicar
essa mudanca** para limpar o que sobrou de versoes anteriores (ate la, o
Firestore ainda guarda o corpo das aulas, que nao e mais lido por ninguem —
so ocupa espaco e e cobrado como leitura). A API nao depende dessa limpeza:
ela ja deriva a contagem de aulas do catalogo de seed, e nao do documento.

### Conteudo dos cursos (aulas)

O corpo de cada aula (texto, codigo, imagens) **nao fica no Firestore** — fica
em `public/assets/courses/content/<slug-do-curso>.json`, um arquivo por curso,
gerado a partir dos mesmos JSONs de `backend/src/seed/`. O frontend busca
esse arquivo direto, como um asset estatico (nunca passa pela API nem pelo
Firestore), e mantem em cache por curso: trocar de capitulo dentro do mesmo
curso nao dispara nenhuma chamada de rede.

Todo conteudo publicado e **publico por design**: qualquer pessoa pode baixar o
JSON estatico pela URL, sem passar por autenticacao. O login serve apenas para
salvar progresso e enviar duvidas; conteudo restrito exigiria ser servido pela
API com verificacao de acesso.

O arquivo tambem carrega o **outline** do curso (titulo + titulo, ordem,
descricao e slug de cada capitulo). Com isso a pagina do capitulo monta a tela
inteira a partir do asset — hero, sumario, prev/next e o texto das aulas — e
**nao existe nenhuma chamada a API no caminho da leitura**. O que vem do
backend (progresso do aluno) entra por cima depois, sem segurar a renderizacao.

O fluxo fica:

| Momento | O que acontece | Vai onde |
| --- | --- | --- |
| Abre o capitulo | Baixa 1 asset estatico (curso inteiro, cacheado) | CDN/hosting |
| chapter abre | `PATCH /api/learning/chapters/:id` → `in-progress` | Firestore |
| Leu ate o fim | `PATCH /api/learning/chapters/:id` → `completed` | Firestore |
| Destaque do sumario | `GET /api/learning/courses/:id/progress` | Firestore |

As tres chamadas do backend sao assincronas e podem falhar sem afetar a
leitura. O Firestore guarda so o metadado (curso/capitulo) e o progresso; o
corpo das aulas e os ponteiros de imagem/anexo sao arquivos estaticos.

O Firestore fica assim dividido:

| Onde | O que guarda |
| --- | --- |
| `backend/src/seed/*.json` | Fonte da verdade: metadado **e** corpo das aulas |
| `public/assets/courses/content/` | Corpo + outline como asset estatico (gerado) |
| `courses` / `chapters` (Firestore) | So o metadado, para listagem, SEO e progresso |
| `chapterProgress` (Firestore) | Quem leu o que |

`npm run content:build` gera esses arquivos; ele roda sozinho antes de
`npm start`/`npm run build` (hooks `prestart`/`prebuild`), entao normalmente
nao precisa rodar a mao — so depois de editar um JSON em `backend/src/seed/`
e quiser conferir o resultado localmente antes de subir.

**Publicacao do asset:** como o JSON e servido publicamente e nao passa pela
API, o unico controle e o proprio build. O campo `published` precisa ser um
booleano explicito em todo curso do catalogo:

- `published: true` — gera o asset;
- `published: false` — nao gera, e o JSON anterior (se houver) e apagado do
  diretorio, para um curso despublicado parar de ser baixavel por URL;
- ausente ou invalido — **o build falha** com mensagem indicando o curso. O
  campo ausente nao pode ser assumido como publicado (vazaria o conteudo de um
  curso fora do catalogo) nem como privado (o capitulo sumiria do ar sem
  nenhum aviso).

O seed valida a mesma regra, entao os dois lados nunca discordam sobre o que e
publico. Os arquivos gerados sao versionados no git de proposito: um build que
nao passe pelo `npm run build` (ex.: `ng build` direto) continuaria servindo o
conteudo.

> Ao criar ou renomear um capitulo, altere **os dois lados**: o JSON em
> `backend/src/seed/` (conteudo) e o Firestore (metadado, via seed). A API avisa
> no log (uma vez por processo) quando um capitulo do Firestore nao existe no
> catalogo; nesse caso a tela do leitor mostra "Aulas nao disponiveis" — o que
> ela **nao** mostra e "em preparacao", para nao sugerir que o capitulo esta
> sendo escrito. A correcao e rodar `npm run content:build` e o seed.

## Documentacao

O diretorio [`docs/`](docs/) contem o planejamento funcional e tecnico do
produto, incluindo autenticacao, area do aluno, administracao de cursos,
exercicios, certificados e deploy.

## Licenca

Projeto privado da Maiawall.