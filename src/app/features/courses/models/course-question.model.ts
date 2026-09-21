export interface CourseQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  authorName: string;
  authorEmail?: string;
  question: string;
  answer: string;
  published: boolean;
  createdAt: string;
  answeredAt?: string;
}

export interface CourseQuestionCreatePayload {
  authorName: string;
  question: string;
}

export interface CourseQuestionAnswerPayload {
  answer: string;
  published: boolean;
}
