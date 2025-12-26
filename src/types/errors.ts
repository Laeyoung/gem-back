import type { GeminiModel, EmbeddingModel } from './models';

export interface AttemptRecord {
  model: GeminiModel | EmbeddingModel;
  error: string;
  timestamp: Date;
  statusCode?: number;
}

export class GeminiBackError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly modelAttempted?: GeminiModel | EmbeddingModel;
  public readonly allAttempts: AttemptRecord[];

  constructor(
    message: string,
    code: string,
    allAttempts: AttemptRecord[] = [],
    statusCode?: number,
    modelAttempted?: GeminiModel | EmbeddingModel
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
