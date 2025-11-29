/**
 * Project finder - Search and validate GitHub repositories using gemback
 */

import { GitHubApiClient } from './github-api.js';
import type { ProjectInfo, FinderConfig, FinderResult, PackageJson } from './types.js';

/**
 * Find GitHub projects using the specified package
 */
export class ProjectFinder {
  private client: GitHubApiClient;
  private config: FinderConfig;

  constructor(config: FinderConfig) {
    this.client = new GitHubApiClient(config.token);
    this.config = config;
  }

  /**
   * Find top projects using the package
   */
  async findProjects(): Promise<FinderResult> {
    console.log(`🔍 Searching for projects using "${this.config.packageName}"...`);

    // Check rate limit before starting
    const rateLimit = await this.client.checkRateLimit();
    console.log(
      `📊 Rate limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`
    );

    if (rateLimit.remaining < 10) {
      throw new Error(
        `Rate limit too low (${rateLimit.remaining} remaining). ` +
          `Resets at ${rateLimit.reset.toISOString()}`
      );
    }

    // Search for package.json files containing the package name
    const query = `"${this.config.packageName}" filename:package.json`;
    const searchResults = await this.client.searchCode(query, 'stars', 100);

    console.log(`📦 Found ${searchResults.total_count} potential repositories`);

    // Validate and collect project information
    const projects: ProjectInfo[] = [];
    const processedRepos = new Set<string>();

    for (const item of searchResults.items) {
      const repo = item.repository;
      const fullName = repo.full_name;

      // Skip if already processed (deduplicate)
      if (processedRepos.has(fullName)) {
        continue;
      }
      processedRepos.add(fullName);

      // Check exclusion criteria
      if (this.isExcluded(repo.full_name, repo.fork, repo.archived)) {
        console.log(`⏭️  Skipping ${fullName} (excluded)`);
        continue;
      }

      // Validate that the package is actually used
      const usageType = await this.validateDependency(
        repo.owner.login,
        repo.name,
        item.path
      );

      if (!usageType) {
        console.log(`⏭️  Skipping ${fullName} (not a valid dependency)`);
        continue;
      }

      // Create project info
      const projectInfo: ProjectInfo = {
        fullName: repo.full_name,
        owner: repo.owner.login,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        lastUpdated: new Date().toISOString(), // Will be updated if needed
        isArchived: repo.archived,
        isFork: repo.fork,
        usageType,
      };

      projects.push(projectInfo);
      console.log(`✅ Added ${fullName} (⭐ ${repo.stargazers_count})`);

      // Stop if we have enough projects
      if (projects.length >= this.config.maxProjects * 2) {
        // Get 2x to account for potential filtering
        break;
      }
    }

    // Sort by stars (descending) and take top N
    const sortedProjects = this.rankProjects(projects);
    const topProjects = sortedProjects.slice(0, this.config.maxProjects);

    console.log(`\n🎯 Selected top ${topProjects.length} projects`);

    return {
      projects: topProjects,
      totalSearched: searchResults.total_count,
      validatedCount: projects.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate that the package is used as a dependency
   * @param owner Repository owner
   * @param repo Repository name
   * @param packageJsonPath Path to package.json file
   * @returns Dependency type or null if not found
   */
  private async validateDependency(
    owner: string,
    repo: string,
    packageJsonPath: string
  ): Promise<'dependency' | 'devDependency' | null> {
    try {
      const packageJson = await this.client.getPackageJson(
        owner,
        repo,
        packageJsonPath
      );

      if (!packageJson) {
        return null;
      }

      // Check if package is in dependencies
      if (
        packageJson.dependencies &&
        this.config.packageName in packageJson.dependencies
      ) {
        return 'dependency';
      }

      // Check if package is in devDependencies
      if (
        packageJson.devDependencies &&
        this.config.packageName in packageJson.devDependencies
      ) {
        return 'devDependency';
      }

      return null;
    } catch (error) {
      console.warn(`Failed to validate ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Check if a repository should be excluded
   * @param fullName Full repository name (owner/repo)
   * @param isFork Whether the repository is a fork
   * @param isArchived Whether the repository is archived
   */
  private isExcluded(fullName: string, isFork: boolean, isArchived: boolean): boolean {
    // Exclude self (gem-back repository)
    if (fullName.toLowerCase().includes('gem-back')) {
      return true;
    }

    // Exclude forks if configured
    if (this.config.excludeForks && isFork) {
      return true;
    }

    // Exclude archived repositories if configured
    if (this.config.excludeArchived && isArchived) {
      return true;
    }

    return false;
  }

  /**
   * Rank projects by multiple criteria
   * Primary: Stars count (descending)
   * Secondary: Non-fork > fork
   * Tertiary: Has description > no description
   */
  private rankProjects(projects: ProjectInfo[]): ProjectInfo[] {
    return projects.sort((a, b) => {
      // Primary: Sort by stars (descending)
      if (a.stars !== b.stars) {
        return b.stars - a.stars;
      }

      // Secondary: Non-fork projects rank higher
      if (a.isFork !== b.isFork) {
        return a.isFork ? 1 : -1;
      }

      // Tertiary: Projects with descriptions rank higher
      const aHasDesc = !!a.description;
      const bHasDesc = !!b.description;
      if (aHasDesc !== bHasDesc) {
        return bHasDesc ? 1 : -1;
      }

      return 0;
    });
  }
}
