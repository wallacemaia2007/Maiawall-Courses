import { Attachment } from '../../../core/models/attachment.model';

export type CourseLevel = 'iniciante' | 'intermediario' | 'avancado' | (string & {});

export type LessonType =
  | 'video'
  | 'article'
  | 'code'
  | 'slides'
  | 'document'
  | (string & {});

export interface CourseInstructor {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  thumbnailUrl?: string;
  level: CourseLevel;
  durationMinutes?: number;
  instructor: CourseInstructor;
  objectives?: string[];
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseDetail extends Course {
  chapters: Chapter[];
  materials?: Attachment[];
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  level: CourseLevel;
  durationMinutes?: number;
  instructorName: string;
  chapterCount: number;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface ChapterSummary {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  order: number;
  lessonCount: number;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  type: LessonType;
  content?: string;
  attachments?: Attachment[];
  durationMinutes?: number;
  order: number;
}

export interface ChapterDetail extends Chapter {
  exercises: ExerciseSummary[];
  materials?: Attachment[];
}

export interface ExerciseSummary {
  id: string;
  chapterId: string;
  title: string;
}

/* ---------- Payloads ---------- */

export interface CourseCreatePayload {
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  thumbnailUrl?: string;
  level: CourseLevel;
  objectives?: string[];
  published: boolean;
  instructorId: string;
}

export type CourseUpdatePayload = Partial<CourseCreatePayload>;

export interface ChapterCreatePayload {
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  order: number;
}

export type ChapterUpdatePayload = Partial<ChapterCreatePayload>;

export interface LessonCreatePayload {
  chapterId: string;
  title: string;
  type: LessonType;
  content?: string;
  durationMinutes?: number;
  order: number;
}

export type LessonUpdatePayload = Partial<LessonCreatePayload>;

/* ---------- Helpers ---------- */

export const COURSE_LEVEL_LABELS: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export function getCourseLevelLabel(level: CourseLevel): string {
  return COURSE_LEVEL_LABELS[level] ?? level;
}