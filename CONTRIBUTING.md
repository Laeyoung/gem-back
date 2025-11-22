# Contributing to Gem Back

Thank you for your interest in contributing to Gem Back! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project follows a standard code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/gem-back.git`
3. Add upstream remote: `git remote add upstream https://github.com/Laeyoung/gem-back.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

## How to Contribute

### Reporting Bugs

- Use the GitHub Issues page
- Check if the issue already exists
- Provide a clear description and reproduction steps
- Include error messages and logs if applicable

### Suggesting Features

- Open an issue with a detailed description
- Explain the use case and benefits
- Be open to discussion and feedback

### Writing Code

1. **Pick an issue** or create one for your proposed changes
2. **Write code** following our coding guidelines
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Run tests** to ensure everything works
6. **Submit a pull request**

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Maintain strict type safety (`noImplicitAny`, `strictNullChecks`)
- Export types for public APIs
- Add JSDoc comments for public functions

### Code Style

- Follow the existing code style
- Use Prettier for formatting (automated)
- Use ESLint for linting (automated)
- Keep functions small and focused
- Use meaningful variable and function names

### Example

```typescript
/**
 * Generates text using the Gemini API with automatic fallback.
 *
 * @param prompt - The text prompt to send to the model
 * @param options - Optional generation parameters
 * @returns Promise resolving to the generated response
 * @throws {GeminiBackError} If all models fail
 */
async generate(prompt: string, options?: GenerateOptions): Promise<GeminiResponse> {
  // Implementation
}
```

## Testing

### Writing Tests

- Add unit tests for new functions
- Add integration tests for new features
- Maintain test coverage above 85%
- Use descriptive test names

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something correctly', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** for new features
3. **Ensure all tests pass**: `npm test`
4. **Ensure code is formatted**: `npm run format`
5. **Ensure linting passes**: `npm run lint`
6. **Update CHANGELOG.md** with your changes
7. **Create a pull request** with a clear description

### Pull Request Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what changes you made and why
- **Link issues**: Reference any related issues
- **Small PRs**: Keep pull requests focused and manageable
- **One feature per PR**: Don't mix unrelated changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(client): add support for custom retry callbacks

Added shouldRetry callback option to allow users to customize
retry behavior based on error types.

Closes #123
```

## Questions?

If you have questions, feel free to:
- Open an issue for discussion
- Reach out to maintainers
- Check existing issues and pull requests

Thank you for contributing to Gem Back!
