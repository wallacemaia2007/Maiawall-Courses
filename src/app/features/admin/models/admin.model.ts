export interface AdminDashboard {
  students: { total: number; newLast30Days: number; activeLast7Days: number };
  courses: { total: number; published: number };
  learning: { completedChapters: number; learners: number };
  questions: { total: number; pending: number };
  leads: { total: number; new: number; converted: number; last30Days: number };
  topCourses: AdminDashboardCourse[];
  recentStudents: AdminStudent[];
  pendingQuestions: AdminPendingQuestion[];
}

export interface AdminDashboardCourse {
  id: string;
  title: string;
  learners: number;
  completedChapters: number;
}

/** Ponto da tendência de sessões (GA4) — um por dia, últimos 14 dias. */
export interface AdminAnalyticsTrendPoint {
  date: string;
  sessions: number;
}

export interface AdminAnalyticsSource {
  source: string;
  medium: string;
  sessions: number;
}

export interface AdminAnalyticsPage {
  path: string;
  views: number;
}

/**
 * Visão geral do Google Analytics (GA4) para o painel admin.
 * `configured: false` quando o GA4 não está configurado no servidor;
 * `error` preenchido quando está configurado mas a consulta falhou.
 */
export interface AdminAnalytics {
  configured: boolean;
  error: string | null;
  activeUsersNow: number | null;
  sessionsLast30Days: number | null;
  usersLast30Days: number | null;
  sessionsTrend: AdminAnalyticsTrendPoint[];
  topSources: AdminAnalyticsSource[];
  topPages: AdminAnalyticsPage[];
}

export interface AdminPendingQuestion {
  id: string;
  courseTitle: string;
  authorName: string;
  question: string;
  createdAt: string;
}

export interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  category?: string;
  level?: string;
  durationMinutes?: number;
  thumbnailUrl?: string;
  published: boolean;
  chapters: number;
  learners: number;
  completedChapters: number;
  updatedAt?: string;
}

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'github';
  emailVerified: boolean;
  createdAt?: string;
  lastLoginAt: string | null;
  completedChapters: number;
  startedCourses: number;
}

export interface AdminAccessEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'github';
  lastLoginAt: string | null;
  /** 'server' = definido em ADMIN_EMAILS (não sai pelo painel). */
  grantedBy: 'panel' | 'server';
  isSelf: boolean;
  revocable: boolean;
}

export const LEAD_STATUSES = ['novo', 'contatado', 'convertido', 'descartado'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  medium: string;
  campaign: string;
  status: LeadStatus;
  notes: string;
  capturedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LeadPayload = Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>;
