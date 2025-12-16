/**
 * TypeScript type definitions for GitHub Projects Showcase
 */

/**
 * Information about a project using gemback
 */
export interface ProjectInfo {
  /** Full repository name (owner/repo) */
  fullName: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  name: string;
  /** Repository description */
  description: string | null;
  /** Repository HTML URL */
  url: string;
  /** Number of stars */
  stars: number;
  /** Primary programming language */
  language: string | null;
  /** Last updated date */
  lastUpdated: string;
  /** Whether the repository is archived */
  isArchived: boolean;
  /** Whether the repository is a fork */
  isFork: boolean;
  /** Type of dependency usage */
  usageType: 'dependency' | 'devDependency';
}

/**
 * GitHub Code Search API result item
 */
export interface GitHubSearchResultItem {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
      avatar_url: string;
      url: string;
    };
    private: boolean;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    stargazers_count: number;
    language: string | null;
    archived: boolean;
  };
}

/**
 * GitHub Code Search API response
 */
export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchResultItem[];
}

/**
 * GitHub Repository API response
 */
export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
  } | null;
  topics: string[];
  visibility: string;
  default_branch: string;
}

/**
 * Package.json file structure
 */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: any;
}

/**
 * Configuration for project finder
 */
export interface FinderConfig {
  /** GitHub token for authentication */
  token: string;
  /** Package name to search for */
  packageName: string;
  /** Maximum number of projects to return */
  maxProjects: number;
  /** Whether to exclude forks */
  excludeForks?: boolean;
  /** Whether to exclude archived repositories */
  excludeArchived?: boolean;
}

/**
 * Result of the project finding operation
 */
export interface FinderResult {
  /** Projects found and validated */
  projects: ProjectInfo[];
  /** Total number of repositories searched */
  totalSearched: number;
  /** Number of repositories that passed validation */
  validatedCount: number;
  /** Search timestamp */
  timestamp: string;
}

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