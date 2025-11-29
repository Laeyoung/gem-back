/**
 * GitHub API client wrapper with authentication and error handling
 */

import { Octokit } from '@octokit/rest';
import type { GitHubSearchResponse, GitHubRepository, PackageJson } from './types.js';

/**
 * GitHub API client with rate limiting and retry logic
 */
export class GitHubApiClient {
  private octokit: Octokit;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'gemback-showcase-bot',
    });
  }

  /**
   * Search for code containing a specific query
   * @param query Search query
   * @param sort Sort order (default: 'stars')
   * @param per_page Results per page (max 100)
   */
  async searchCode(
    query: string,
    sort: 'indexed' | 'stars' = 'stars',
    per_page: number = 100
  ): Promise<GitHubSearchResponse> {
    return this.retryWithBackoff(async () => {
      const response = await this.octokit.rest.search.code({
        q: query,
        sort,
        order: 'desc',
        per_page,
      });

      return {
        total_count: response.data.total_count,
        incomplete_results: response.data.incomplete_results,
        items: response.data.items.map((item) => ({
          name: item.name,
          path: item.path,
          sha: item.sha,
          url: item.url,
          git_url: item.git_url,
          html_url: item.html_url,
          repository: {
            id: item.repository.id,
            node_id: item.repository.node_id,
            name: item.repository.name,
            full_name: item.repository.full_name,
            owner: {
              login: item.repository.owner.login,
              id: item.repository.owner.id,
              avatar_url: item.repository.owner.avatar_url,
              url: item.repository.owner.url,
            },
            private: item.repository.private,
            html_url: item.repository.html_url,
            description: item.repository.description,
            fork: item.repository.fork,
            url: item.repository.url,
            stargazers_count: item.repository.stargazers_count,
            language: item.repository.language,
            archived: item.repository.archived,
          },
        })),
      };
    });
  }

  /**
   * Get detailed repository information
   * @param owner Repository owner
   * @param repo Repository name
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.retryWithBackoff(async () => {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return response.data as GitHubRepository;
    });
  }

  /**
   * Get file content from a repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param path File path
   */
  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    return this.retryWithBackoff(async () => {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in response.data && typeof response.data.content === 'string') {
        // Decode base64 content
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      throw new Error(`File not found or is a directory: ${path}`);
    });
  }

  /**
   * Parse package.json content from a repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param path Path to package.json (default: 'package.json')
   */
  async getPackageJson(
    owner: string,
    repo: string,
    path: string = 'package.json'
  ): Promise<PackageJson | null> {
    try {
      const content = await this.getFileContent(owner, repo, path);
      return JSON.parse(content) as PackageJson;
    } catch (error) {
      console.warn(`Failed to fetch package.json from ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Check rate limit status
   */
  async checkRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    const response = await this.octokit.rest.rateLimit.get();
    const coreLimit = response.data.resources.core;

    return {
      limit: coreLimit.limit,
      remaining: coreLimit.remaining,
      reset: new Date(coreLimit.reset * 1000),
    };
  }

  /**
   * Retry a function with exponential backoff
   * @param fn Function to retry
   * @param attempt Current attempt number
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, attempt: number = 1): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry on authentication errors
      if (error.status === 401 || error.status === 403) {
        throw new Error(`GitHub API authentication error: ${error.message}`);
      }

      // Don't retry on validation errors
      if (error.status === 422) {
        throw new Error(`GitHub API validation error: ${error.message}`);
      }

      // Retry on rate limit or server errors
      if (
        (error.status === 429 || error.status >= 500) &&
        attempt < this.maxRetries
      ) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms...`);
        await this.sleep(delay);
        return this.retryWithBackoff(fn, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Sleep for a specified duration
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
