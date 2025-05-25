export interface ErrorResponse {
  statusCode: number;
  code: string;
  error: string;
  message: string;
}

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  validation?: unknown[];
  validationContext?: string;
}
