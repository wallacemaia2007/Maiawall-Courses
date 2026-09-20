export interface Certificate {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  userName: string;
  studentName?: string;
  issuedAt: string;
  expiresAt?: string;
  status?: 'valid' | 'expired' | 'revoked' | 'invalid' | (string & {});
  url?: string;
  verified?: boolean;
}

export interface CertificateValidation {
  valid: boolean;
  certificate?: Certificate;
  status?: 'valid' | 'expired' | 'revoked' | 'invalid' | (string & {});
  message?: string;
}

export interface CertificateIssuePayload {
  courseId: string;
  userId: string;
}
