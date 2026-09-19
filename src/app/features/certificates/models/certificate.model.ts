export interface Certificate {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  userName: string;
  issuedAt: string;
  url?: string;
  verified?: boolean;
}

export interface CertificateValidation {
  valid: boolean;
  certificate?: Certificate;
}

export interface CertificateIssuePayload {
  courseId: string;
  userId: string;
}