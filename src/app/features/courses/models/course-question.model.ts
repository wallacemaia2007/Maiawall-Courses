import { CourseCategory } from './course.model';

export interface CourseQuestionAuthor {
  id: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt?: string;
  lastLoginAt?: string;
  questionsCount: number;
}

export interface CourseQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  authorName: string;
  authorEmail?: string;
  author?: CourseQuestionAuthor;
  question: string;
  answer: string;
  published: boolean;
  featured: boolean;
  createdAt: string;
  answeredAt?: string;
}

export interface CourseQuestionCourse {
  id: string;
  title: string;
  slug: string;
  category: CourseCategory | null;
}

export interface CourseQuestionGroup {
  course: CourseQuestionCourse;
  questions: CourseQuestion[];
}

export interface CourseQuestionCreatePayload {
  authorName: string;
  question: string;
}

export interface CourseQuestionAnswerPayload {
  answer: string;
  published: boolean;
}
