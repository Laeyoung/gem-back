import type { GeminiModel } from './models';

export interface AttemptRecord {
  model: GeminiModel;
  error: string;
  timestamp: Date;
  statusCode?: number;
}

export class GeminiBackError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly modelAttempted?: GeminiModel;
  public readonly allAttempts: AttemptRecord[];

  constructor(
    message: string,
    code: string,
    allAttempts: AttemptRecord[] = [],
    statusCode?: number,
    modelAttempted?: GeminiModel
  ) {
    super(message);
    this.name = 'GeminiBackError';
    this.code = code;
    this.statusCode = statusCode;
    this.modelAttempted = modelAttempted;
    this.allAttempts = allAttempts;
    Error.captureStackTrace(this, this.constructor);
  }
}
