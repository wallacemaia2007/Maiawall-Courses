export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function unwrapApiData<T>(response: ApiResponse<T>): T {
  return response.data;
}