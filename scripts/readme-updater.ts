/**
 * README updater - Safely update README.md with project showcase
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ProjectInfo } from './types.js';

const MARKER_START = '<!-- PROJECTS_SHOWCASE_START -->';
const MARKER_END = '<!-- PROJECTS_SHOWCASE_END -->';

/**
 * Update README.md with project showcase section
 */
export class ReadmeUpdater {
  private readmePath: string;

  constructor(readmePath: string = 'README.md') {
    this.readmePath = path.resolve(readmePath);
  }

  /**
   * Update the README with new project list
   * @param projects List of projects to showcase
   */
  async updateReadme(projects: ProjectInfo[]): Promise<void> {
    console.log(`📝 Updating README at ${this.readmePath}...`);

    // Read current README content
    const content = await fs.readFile(this.readmePath, 'utf-8');

    // Find markers
    const markers = this.findMarkers(content);
    if (!markers) {
      throw new Error(
        `Markers not found in README. Please add the following markers:\n` +
          `${MARKER_START}\n...\n${MARKER_END}`
      );
    }

    // Generate new showcase content
    const showcaseContent = this.generateShowcaseContent(projects);

    // Reconstruct README
    const newContent =
      content.slice(0, markers.startIndex) +
      MARKER_START +
      '\n' +
      showcaseContent +
      '\n' +
      MARKER_END +
      content.slice(markers.endIndex);

    // Write back to file
    await fs.writeFile(this.readmePath, newContent, 'utf-8');

    console.log(`✅ README updated successfully`);
  }

  /**
   * Find marker positions in README content
   * @param content README content
   * @returns Marker positions or null if not found
   */
  private findMarkers(content: string): {
    startIndex: number;
    endIndex: number;
  } | null {
    const startIndex = content.indexOf(MARKER_START);
    const endIndex = content.indexOf(MARKER_END);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    if (startIndex >= endIndex) {
      throw new Error('Invalid marker positions: START must come before END');
    }

    return {
      startIndex: startIndex + MARKER_START.length,
      endIndex,
    };
  }

  /**
   * Generate showcase section content
   * @param projects List of projects
   * @returns Markdown content for showcase section
   */
  private generateShowcaseContent(projects: ProjectInfo[]): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Handle empty state
    if (projects.length === 0) {
      return this.generateEmptyState(timestamp);
    }

    // Generate project list
    const lines: string[] = ['## 🌟 Projects Using Gem Back', ''];

    lines.push('Here are some awesome projects using Gem Back in production:', '');

    projects.forEach((project, index) => {
      const number = index + 1;
      const name = project.name;
      const url = project.url;
      const stars = project.stars.toLocaleString();
      const description = project.description || 'No description available';
      const language = project.language || 'Unknown';

      lines.push(`${number}. **[${name}](${url})** ⭐ ${stars}`);
      lines.push(`   - ${description}`);
      lines.push(`   - 🏷️ Language: ${language}`);
      lines.push('');
    });

    lines.push(`*Updated: ${timestamp}* | *Showcasing top projects by GitHub stars*`);

    return lines.join('\n');
  }

  /**
   * Generate empty state content
   * @param timestamp Update timestamp
   * @returns Markdown content for empty state
   */
  private generateEmptyState(timestamp: string): string {
    return [
      '## 🌟 Projects Using Gem Back',
      '',
      '**Be the first to showcase your project using Gem Back!**',
      '',
      "If you're using Gem Back in your project, we'd love to feature it here.",
      'Your project could be the first one listed!',
      '',
      `*Updated: ${timestamp}*`,
    ].join('\n');
  }

  /**
   * Check if markers exist in README
   */
  async hasMarkers(): Promise<boolean> {
    try {
      const content = await fs.readFile(this.readmePath, 'utf-8');
      const markers = this.findMarkers(content);
      return markers !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add markers to README if they don't exist
   * @param insertAfterPattern Pattern to search for insertion point
   */
  async addMarkersIfMissing(
    insertAfterPattern: string = '## 💡 FAQ'
  ): Promise<boolean> {
    const hasMarkers = await this.hasMarkers();
    if (hasMarkers) {
      console.log('✅ Markers already exist in README');
      return false;
    }

    console.log('📝 Adding markers to README...');

    const content = await fs.readFile(this.readmePath, 'utf-8');
    const insertIndex = content.indexOf(insertAfterPattern);

    if (insertIndex === -1) {
      throw new Error(`Could not find pattern: ${insertAfterPattern}`);
    }

    // Find end of FAQ section (next --- or end of file)
    let endIndex = content.indexOf('\n---\n', insertIndex);
    if (endIndex === -1) {
      endIndex = content.length;
    } else {
      endIndex += 1; // Include the newline before ---
    }

    // Create showcase section
    const showcaseSection = [
      '',
      MARKER_START,
      this.generateEmptyState(new Date().toISOString().split('T')[0]),
      MARKER_END,
      '',
    ].join('\n');

    // Insert showcase section
    const newContent =
      content.slice(0, endIndex) + showcaseSection + content.slice(endIndex);

    await fs.writeFile(this.readmePath, newContent, 'utf-8');

    console.log('✅ Markers added to README');
    return true;
  }
}
