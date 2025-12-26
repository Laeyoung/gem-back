# Agent Instructions

This repository contains the Gem Back library implementation for multiple languages.

## Directory Structure
- `/` (Root): Node.js implementation (Legacy/Main).
- `/python`: Python implementation.
- `/go`: Go implementation.
- `/kotlin`: Kotlin implementation.

## Guidelines for Agents
1.  **Context Awareness**: When working on a specific language, restrict your file operations to that language's directory (e.g., `python/`) unless you are syncing shared configuration or documentation.
2.  **Parity**: Ensure feature parity across all languages. If you add a feature to Node.js, plan to add it to Python, Go, and Kotlin.
3.  **Tests**: Every code change must be accompanied by language-specific tests.
    -   Node.js: `npm test`
    -   Python: `pytest`
4.  **Documentation**: Update the root `README.md` only for high-level info. Language-specific usage details go into `python/README.md`, etc.
