export const API_PREFIX = '/api';

/*
 * Endpoints de autenticação. Seguem o contrato usado no Maiawall Homolog
 * (Spring Boot + Spring Security). Confirmar shape exato com o backend.
 */
export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  signup: '/auth/signup',
  logout: '/auth/logout',
  me: '/auth/me',
  refreshToken: '/auth/refresh-token',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
  oauthGoogle: '/auth/oauth/google',
  oauthGithub: '/auth/oauth/github',
  oauthExchange: '/auth/oauth/exchange',
} as const;

export const USER_ENDPOINTS = {
  me: '/users/me',
  updateMe: '/users/me',
  changePassword: '/users/me/password',
} as const;

/*
 * ENDPOINTS DE DOMÍNIO (PLACEHOLDER)
 * Os caminhos abaixo são uma proposta de organização para alinhamento com o
 * contrato real do backend (Spring Boot). Ajustar `api.constants.ts` e o
 * service correspondente quando o contrato estiver definido — nenhuma outra
 * parte do frontend precisa mudar, pois todos os services centralizam a URL aqui.
 */
export const COURSE_ENDPOINTS = {
  list: '/courses',
  detail: '/courses',
  summary: '/courses',
} as const;

export const CHAPTER_ENDPOINTS = {
  detail: '/chapters',
  public: '/chapters/slug',
} as const;

export const LESSON_ENDPOINTS = {
  detail: '/lessons',
} as const;

export const EXERCISE_ENDPOINTS = {
  list: '/exercises',
  detail: '/exercises',
} as const;

export const SUBMISSION_ENDPOINTS = {
  list: '/submissions',
  detail: '/submissions',
} as const;

export const ENROLLMENT_ENDPOINTS = {
  myCourses: '/enrollments',
  enroll: '/enrollments',
  drop: '/enrollments',
} as const;

export const PROGRESS_ENDPOINTS = {
  course: '/progress/courses',
  chapter: '/progress/chapters',
  exercise: '/progress/exercises',
} as const;

export const CERTIFICATE_ENDPOINTS = {
  mine: '/certificates/mine',
  admin: '/admin/certificates',
  publicValidation: '/certificates/validate',
} as const;

export const ATTACHMENT_ENDPOINTS = {
  create: '/attachments',
  download: '/attachments',
} as const;

export const QUESTION_ENDPOINTS = {
  byCourse: (courseId: string) => `/courses/${courseId}/questions`,
  admin: '/admin/questions',
} as const;

export const ADMIN_ENDPOINTS = {
  dashboard: '/admin/dashboard',
  courses: '/admin/courses',
  students: '/admin/students',
  access: '/admin/access',
  leads: '/admin/leads',
} as const;
