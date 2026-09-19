export type ProgressStatus = 'not-started' | 'in-progress' | 'completed';

export interface CourseProgress {
  courseId: string;
  userId: string;
  completedChapters: number;
  totalChapters: number;
  percent: number;
  status: ProgressStatus;
  updatedAt?: string;
}

export interface ChapterProgress {
  chapterId: string;
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  status: ProgressStatus;
  updatedAt?: string;
}

export interface ExerciseProgress {
  exerciseId: string;
  status: 'not-answered' | 'submitted' | 'graded';
  score?: number;
}

export interface StudentCourseOverview {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl?: string;
  };
  progress: CourseProgress;
}