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
