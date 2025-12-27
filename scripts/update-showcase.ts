#!/usr/bin/env node
/**
 * Main script to update GitHub projects showcase in README
 */

import { ProjectFinder } from './project-finder.js';
import { ReadmeUpdater } from './readme-updater.js';
import type { FinderConfig } from './types.js';

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting GitHub Projects Showcase Update');
  console.log('='.repeat(50));

  try {
    // Get GitHub token from environment
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        'GITHUB_TOKEN environment variable is required.\n' +
          'Get a token at: https://github.com/settings/tokens'
      );
    }

    // Configuration
    const config: FinderConfig = {
      token,
      packageName: 'gemback',
      maxProjects: 5,
      excludeForks: false, // Include forks
      excludeArchived: true, // Exclude archived repos
    };

    // Step 1: Find projects
    console.log('\n📦 Step 1: Finding projects...');
    const finder = new ProjectFinder(config);
    const result = await finder.findProjects();

    console.log('\n📊 Search Results:');
    console.log(`   Total repositories found: ${result.totalSearched}`);
    console.log(`   Validated projects: ${result.validatedCount}`);
    console.log(`   Selected for showcase: ${result.projects.length}`);

    if (result.projects.length > 0) {
      console.log('\n🎯 Top Projects:');
      result.projects.forEach((project, index) => {
        console.log(
          `   ${index + 1}. ${project.fullName} (⭐ ${project.stars})`
        );
      });
    } else {
      console.log('\n⚠️  No projects found using gemback yet');
    }

    // Step 2: Update README
    console.log('\n📝 Step 2: Updating README...');
    const updater = new ReadmeUpdater('README.md');

    // Ensure markers exist
    const hasMarkers = await updater.hasMarkers();
    if (!hasMarkers) {
      console.log('⚠️  Markers not found in README. Adding them now...');
      await updater.addMarkersIfMissing('## 💡 FAQ');
    }

    // Update with projects
    await updater.updateReadme(result.projects);

    console.log('\n✅ Showcase update completed successfully!');
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error updating showcase:');
    console.error(error.message);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   - Ensure GITHUB_TOKEN is set correctly');
    console.error('   - Check your GitHub API rate limit');
    console.error('   - Verify README.md exists and is writable');

    process.exit(1);
  }
}

// Run main function
main();
