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

![Banner de referencia](public/assets/banners/ufu.api.png)

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

Usuarios com perfil administrativo ou de instrutor possuem uma area dedicada
para manter o catalogo e acompanhar a operacao da plataforma, incluindo cursos,
conteudo, exercicios, alunos, correcoes e certificados.

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
| `npm --prefix backend run seed:courses` | Recria o catalogo local no Firestore |
| `npm run kill:ports` | Libera as portas locais no Windows |

O seed usa os JSONs de `backend/src/seed/` (um arquivo por curso, combinados
pelo `course-catalog.js`) como fonte do catalogo e recria as
colecoes de cursos, capitulos e aulas sem alterar os usuarios.

## Documentacao

O diretorio [`docs/`](docs/) contem o planejamento funcional e tecnico do
produto, incluindo autenticacao, area do aluno, administracao de cursos,
exercicios, certificados e deploy.

## Licenca

Projeto privado da Maiawall.