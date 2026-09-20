# Maiawall Cursos — Frontend (Arquitetura)

Plataforma de cursos online — **`cursos.maiawall.com`** (em construção).

Este repositório contém **somente a fundação arquitetural** do frontend em Angular.
As páginas são stubs estruturais (sem layout final, sem funcionalidade), prontos para
evoluírem para as telas reais seguindo as convenções descritas abaixo.

> Referência de arquitetura: **Maiawall-Homolog** (Angular 19, standalone, signals,
> guards/interceptors funcionais, lazy loading por feature).

---

## Stack

| Camada     | Escolha                                            |
| ---------- | -------------------------------------------------- |
| Framework  | Angular **19** (standalone components)             |
| Linguagem  | TypeScript (strict)                                |
| Estilo     | Tailwind CSS + SCSS (design tokens em `styles.scss`) |
| State      | Signals (`signal` + `computed`) em serviços de estado |
| HTTP       | `HttpClient` + interceptors funcionais             |
| Formulários | Reactive Forms                                     |
| Infra      | Angular CLI 19, ESLint flat config, Prettier       |

---

## Estrutura de pastas

```
src/app/
├── app.config.ts            # Providers globais (router, http, interceptors)
├── app.routes.ts            # Mapa de rotas raiz (lazy loading por área)
├── core/                    # INFRAESTRUTURA: nada de UI aqui
│   ├── auth/                # TokenStorage, AuthState (signals), AuthService
│   ├── guards/              # authGuard, guestGuard, roleGuard (+ child variants)
│   ├── interceptors/        # auth (Bearer + timeout), error (normalização + 401)
│   ├── models/              # ApiResponse, ApiError, User/Role, Page, Attachment
│   ├── services/            # user, attachment (upload/progress), notification
│   └── constants/           # Central de endpoints da API
├── layouts/                 # Layouts raiz (≠ feature layouts)
│   ├── public-layout/       # Navbar + Footer (visão pública)
│   ├── auth-layout/         # Páginas de autenticação
│   └── app-layout/          # Sidebar + Topbar (área do aluno)
├── shared/                 # REUSO: componentes/diretivas/pipes/presentação
│   ├── ui/                  # alert-banner, progress-bar, file-upload, rich-text-editor
│   ├── components/          # modal, confirm-delete-modal, loading-spinner, empty-state
│   ├── directives/          # integer-input
│   ├── pipes/               # duration, file-size
│   └── utils/               # date.utils
└── features/                # FEATURES: uma pasta por domínio, isolada
    ├── home/                # Landing pública
    ├── auth/                # login, signup, forgot/reset-password, verify-email
    ├── courses/             # Catálogo (slug-based, público)
    ├── student/             # Área do aluno /app (id-based, autenticado)
    ├── exercises/           # Exercícios e submissões
    ├── certificates/        # Certificados (emissão + validação pública)
    ├── profile/             # Perfil e troca de senha
    ├── admin/               # Painel administrativo (ADMIN/INSTRUCTOR)
    └── not-found/
```

### Regras de camada

- `core` e `shared` **não dependem de `features`**.
- `features` podem usar `core` e `shared`, e layouts raiz.
- Features **não importam entre si** de forma direta (ex.: `student` não importa
  `courses/course-card`; compartilhamento futuro vai para `shared`).
- Toda feature isolada tem seu próprio `routes.ts`, `pages/`, `components/`,
  `services/` e `models/` — carregada com `loadChildren`/`loadComponent`.

---

## Rotas

```
/                         public-layout ─ home
/cursos                   public-layout ─ listagem (slug)
/cursos/:slug             public-layout ─ detalhe do curso (slug)
/cursos/:slug/capitulo/:chapterSlug   public-layout ─ aula pública (slug)
/certificados/:code       public-layout ─ validação de certificado

/login /signup /forgot-password /reset-password /verify-email
                          auth-layout (guestGuard)

/app/dashboard            app-layout (authGuard)
/app/cursos /app/cursos/:id
/app/capitulo/:id
/app/exercicios /app/exercicios/:id/resposta
/app/submissoes /app/submissoes/:id
/app/certificados
/app/perfil

/admin/...                admin-layout (authGuard + roleChildGuard ['ADMIN','INSTRUCTOR'])
                          dashboard, cursos, cursos/:id, capitulos, exercicios,
                          alunos, submissoes, certificados

/not-found                404
**                        redirect → /not-found
```

Convenção de IDs: **catálogo público usa `slug`** (SEO/URLs amigáveis);
**áreas autenticadas usam `id`** (integridade referencial).

---

## Autenticação (JWT — Spring Boot / Spring Security)

- `TokenStorageService` → armazena `access_token` e `refresh_token` no `localStorage`
  (chaves em `core/models/auth.model.ts`, `AUTH_STORAGE_KEYS`).
- `AuthStateService` → expõe `accessToken()` e `user()` como **signals**, além de
  `isAuthenticated()` computado. Mantém o estado da sessão reativo sem recarregar a página.
- `AuthService` → `login`, `signup`, `logout`, `getSession` (`/auth/me`),
  `refreshSession`, `requestPasswordRecovery`, `resetPassword`, `verifyEmail`.
- Fluxo do `authGuard` (funcional):
  1. Sem token local → redireciona para `/login?redirect=<url>`.
  2. Com token → valida a sessão via `GET /auth/me` (erros tratados no guard).
- `authInterceptor` → injeta `Authorization: Bearer <token>` em toda requisição e
  impõe timeout de 15s.
- `errorInterceptor` → normaliza falhas no padrão `ApiError`; em **401** limpa a
  sessão e redireciona para `/login` (sessão expirada).
- Páginas de auth são protegidas com `guestGuard` (autenticado é jogado para `/app/dashboard`).

> **Refresh token**: `refreshSession()` ainda é conceitual (aponta para o token de
> acesso). Como o backend ainda não está definido, decidir o fluxo de renovação
> quando o contrato Spring/Security existir.

### Login social (OAuth 2.0 — Authorization Code)

O backend é o cliente OAuth confidencial (Express + `fetch` nativo + JWT manual, sem
Passport). Fluxo:

1. O front navega para `GET /api/auth/oauth/{provider}` (`github` | `google`).
2. O backend grava um `state` em cookie httpOnly de 5 min (assinado com `JWT_SECRET`)
   e redireciona para o provedor.
3. O provedor volta para `GET /api/auth/oauth/{provider}/callback`.
4. O backend valida `state`, troca o `code` pelo token do provedor, busca o perfil,
   vincula ou cria o usuário (`githubId`/`googleId` + `email` verificado) e emite um
   **ticket de troca** de uso único (60 s), redirecionando para
   `FRONTEND_ORIGIN/auth/callback?ticket=...`. Nenhum token trafega pela URL.
5. O front chama `POST /api/auth/oauth/exchange { ticket }` e recebe o mesmo shape de
   `login`/`signup` (`{ user, tokens: { accessToken, refreshToken } }`). O ticket é
   apagado do usuário assim que trocado.

Configuração nos provedores (URLs montadas a partir de `OAUTH_CALLBACK_BASE_URL` no backend):

| Provedor | O que cadastrar |
| -------- | --------------- |
| GitHub (OAuth App) | Authorization callback URL = `{OAUTH_CALLBACK_BASE_URL}/api/auth/oauth/github/callback` (scope `read:user user:email`) |
| Google (Client OAuth tipo "Web application") | Authorized redirect URI = `{OAUTH_CALLBACK_BASE_URL}/api/auth/oauth/google/callback` (scope `openid email profile`) |

Em producao: `OAUTH_CALLBACK_BASE_URL=https://api.courses.maiawall.com` e `FRONTEND_ORIGIN=https://courses.maiawall.com`
(em producao, o rewrite da Vercel encaminha `/api` para o backend). Deixar
`GITHUB_CLIENT_ID`/`GOOGLE_CLIENT_ID` vazios desativa
o provedor.

---

## HTTP e contratos com o backend

- Resposta padrão do backend segue o envelope `ApiResponse<T>`:
  `{ code, data, message, timestamp }`. `unwrapApiData()` extrai `data` (e
  resolve `null` para o caso de "não encontrado").
- Erros normalizados em `ApiError` via `toApiError()`.
- Segurança: o projeto **não inventa backend**. Todos os caminhos em
  `src/app/core/constants/api.constants.ts` são **PLACEHOLDER** de organização
  (agrupados por domínio) e devem ser alinhados ao contrato real da API.

| Endpoint (placeholder)            | Uso                         |
| --------------------------------- | --------------------------- |
| `/auth/**`                         | login, cadastro, sessão…    |
| `/users/me`                        | perfil                      |
| `/courses/**` `/chapters/**` ...   | catálogo e conteúdo         |
| `/progress/**` `/enrollments/**`   | matrícula/progresso         |
| `/exercises/**` `/submissions/**`  | exercícios/correção         |
| `/certificates/**` `/attachments/**` | certificados, uploads     |

- Dev: `proxy.conf.json` roteia `/api` → `http://localhost:8080`.
- Prod: `environment.production.ts` usa `/api` (reverse proxy/CDN). Se a API
  ganhar domínio próprio, trocar esse valor (ex.: `https://api.cursos.maiawall.com/api`).

---

## Serviços

- Serviços de domínio (`providedIn: 'root'`) expõem `Observable`s prontos para o
  template via pipe `async` (padrão de containers de dados).
- Serviços de **estado** (ex.: `AuthStateService`) usam signals.
- Convenções de nomenclatura: `list`, `listMine`, `listAll`, `getById`, `getBySlug`,
  `create`, `update`, `delete` (+ variantes por domínio).

---

## Decisões reaproveitadas do Maiawall-Homolog

- Standalone components + `ChangeDetectionStrategy.OnPush` + `inject()` (sem
  construtor para DI).
- Lazy loading total por feature (`loadChildren`/`loadComponent`).
- Layouts raiz em `src/app/layouts/` com N rotas `path: ''` por grupo visual
  (público / auth / logado); guarda por área.
- Guards e interceptors **funcionais** (`CanActivateFn`, `HttpInterceptorFn`).
- Endpoints centralizados e tipados em `**/constants/api.constants.ts`.
- Envelopes `ApiResponse<T>` + helpers `unwrapApiData` / `emptyPage`.
- SCSS escopado (`styleUrl` + prefixo de classe por componente) + design tokens.

---

## Próximos passos (fora do escopo desta fundação)

1. Definir o contrato da API Spring e alinhar `api.constants.ts`.
2. Implementar as telas reais a partir dos stubs de cada feature.
3. Navegação e estado de aluno: consumir `ProgressService`/`EnrollmentService`.
4. Fluxo de correção no admin (`submissoes`).
5. Emissão/validação de certificados.