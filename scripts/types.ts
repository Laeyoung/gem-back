/**
 * Shared types for model fetcher and code generator scripts
 */

/**
 * Model metadata fetched from Gemini API
 */
export interface ModelMetadata {
  /** Model identifier (e.g., "gemini-2.5-flash") */
  name: string;
  /** Human-readable model name (e.g., "Gemini 2.5 Flash") */
  displayName: string;
  /** Model description from API */
  description?: string;
  /** Maximum input tokens */
  inputTokenLimit: number;
  /** Maximum output tokens */
  outputTokenLimit: number;
  /** Supported generation methods */
  supportedMethods: string[];
  /** Model version (if provided by API) */
  version?: string;
}

/**
 * Model classification based on stability
 */
export type ModelClassification = 'stable' | 'preview' | 'experimental';

/**
 * Processed model information for code generation
 */
export interface ProcessedModel {
  /** Model identifier */
  name: string;
  /** Human-readable name */
  displayName: string;
  /** Model description */
  description: string;
  /** Classification */
  classification: ModelClassification;
  /** Priority (lower number = higher priority) */
  priority: number;
  /** Maximum tokens */
  maxTokens: number;
  /** Rate limits (RPM) */
  rpm?: number;
  /** Rate limits (RPD) */
  rpd?: number;
}

/**
 * Model change detection result
 */
export interface ModelChanges {
  /** Models added since last fetch */
  added: string[];
  /** Models removed since last fetch */
  removed: string[];
  /** Models with updated metadata */
  updated: string[];
  /** Whether any changes were detected */
  hasChanges: boolean;
}

/**
 * Gemini API response for model listing
 */
export interface GeminiModelsApiResponse {
  models: Array<{
    name: string;
    displayName: string;
    description?: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
    version?: string;
  }>;
  nextPageToken?: string;
}
