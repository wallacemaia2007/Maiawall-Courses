import { Attachment } from '../../../core/models/attachment.model';

export type ExerciseType =
  | 'multiple-choice'
  | 'open-answer'
  | 'code'
  | 'true-false'
  | (string & {});

export interface Exercise {
  id: string;
  chapterId: string;
  courseId: string;
  title: string;
  description?: string;
  type: ExerciseType;
  order: number;
  points?: number;
  published: boolean;
}

export interface MultipleChoiceQuestion {
  id: string;
  exerciseId: string;
  statement: string;
  options: {
    id: string;
    label: string;
  }[];
}

export type Answer =
  | { kind: 'text'; value: string }
  | { kind: 'code'; language: string; value: string }
  | { kind: 'choice'; questionId: string; optionId: string }
  | { kind: 'boolean'; value: boolean };

export type SubmissionStatus = 'draft' | 'submitted' | 'graded';

export interface Submission {
  id: string;
  exerciseId: string;
  userId: string;
  answer: Answer[];
  attachments: Attachment[];
  status: SubmissionStatus;
  score?: number;
  submittedAt?: string;
  gradedAt?: string;
}

export interface SubmissionFeedback {
  id: string;
  submissionId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface SubmissionReviewPayload {
  score: number;
  feedback: string;
}

/* ---------- Payloads ---------- */

export interface ExerciseCreatePayload {
  chapterId: string;
  title: string;
  description?: string;
  type: ExerciseType;
  order: number;
  points?: number;
  published: boolean;
}

export type ExerciseUpdatePayload = Partial<ExerciseCreatePayload>;

export interface SubmissionCreatePayload {
  exerciseId: string;
  answer: Answer[];
  attachments?: Attachment[];
}

/* ---------- Helpers ---------- */

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  'multiple-choice': 'Múltipla escolha',
  'open-answer': 'Resposta aberta',
  code: 'Código',
  'true-false': 'Verdadeiro ou falso',
};

export function getExerciseTypeLabel(type: ExerciseType): string {
  return EXERCISE_TYPE_LABELS[type] ?? type;
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Rascunho',
  submitted: 'Enviada',
  graded: 'Corrigida',
};