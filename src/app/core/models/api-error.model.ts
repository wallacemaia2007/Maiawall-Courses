import { HttpErrorResponse } from '@angular/common/http';

import { ApiResponse } from './api-response.model';

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
  raw?: unknown;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiResponse<unknown>> & {
      errors?: Record<string, string[]>;
    };

    return {
      status: error.status,
      message: body?.message ?? error.message,
      fieldErrors: body?.errors,
      raw: error,
    };
  }

  return {
    status: 0,
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    raw: error,
  };
}