# NPM Publishing Guide

This document contains the checklist and instructions for publishing `gemback` to NPM.

## Pre-Publish Checklist

### 1. Version Management

- [ ] Update version in `package.json` following [Semantic Versioning](https://semver.org/)
  - **Patch** (0.1.x): Bug fixes
  - **Minor** (0.x.0): New features (backward compatible)
  - **Major** (x.0.0): Breaking changes
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Commit version changes: `git commit -m "chore: bump version to x.x.x"`
- [ ] Create git tag: `git tag v0.1.0`

### 2. Code Quality Checks

Run all checks to ensure package quality:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format:check

# Run all tests
npm test

# Build for production
npm run build
```

All checks must pass before publishing.

### 3. Package Validation

```bash
# Dry-run packaging to see what will be published
npm pack --dry-run

# Verify package contents
# Should include: dist/, README.md, LICENSE, package.json
# Should NOT include: src/, tests/, examples/, node_modules/
```

Expected package size: ~10 KB

### 4. Local Testing

Test the package locally before publishing:

```bash
# Create tarball
npm pack

# Install in a test project
cd /path/to/test-project
npm install /path/to/gem-back/gemback-0.1.0.tgz

# Verify imports work
node -e "const { GemBack } = require('gemback'); console.log('✓ CJS import works');"
node -e "import('gemback').then(m => console.log('✓ ESM import works'));"
```

### 5. Documentation Review

- [ ] README.md is up to date
- [ ] All examples work correctly
- [ ] API documentation is accurate
- [ ] CHANGELOG.md reflects all changes
- [ ] Links in documentation are valid

### 6. Repository State

- [ ] All changes are committed
- [ ] Working directory is clean: `git status`
- [ ] On main/master branch (or release branch)
- [ ] Pushed to remote: `git push origin main --tags`

## Publishing Steps

### First-Time Setup

1. Create NPM account at https://www.npmjs.com/signup
2. Login to NPM CLI:
   ```bash
   npm login
   ```
3. Verify login:
   ```bash
   npm whoami
   ```

### Publishing

1. **Final verification:**
   ```bash
   npm run prepublishOnly
   ```

2. **Publish to NPM:**

   For first release or regular update:
   ```bash
   npm publish
   ```

   For beta/test versions:
   ```bash
   npm publish --tag beta
   ```

3. **Verify publication:**
   ```bash
   npm view gemback
   ```

4. **Test installation:**
   ```bash
   npm install gemback
   ```

### Post-Publish Steps

1. Create GitHub release:
   - Go to https://github.com/Laeyoung/gem-back/releases/new
   - Select the version tag
   - Copy release notes from CHANGELOG.md
   - Publish release

2. Announce the release:
   - Update README badges if needed
   - Share on relevant platforms (optional)

3. Monitor:
   - Check NPM package page: https://www.npmjs.com/package/gemback
   - Watch for issues or bug reports

## Troubleshooting

### Common Issues

**"You do not have permission to publish"**
- Verify you're logged in: `npm whoami`
- Check package name availability: `npm view gemback`
- Ensure you have publishing rights

**"Package already exists"**
- Version number must be unique
- Increment version in package.json
- Update git tag

**"prepublishOnly script failed"**
- Run each script individually to find the issue:
  - `npm run build`
  - `npm test`
- Fix any failing tests or build errors

**"Package size too large"**
- Check what's being included: `npm pack --dry-run`
- Update `.npmignore` to exclude unnecessary files
- Verify `files` field in package.json

## Unpublishing (Emergency Only)

⚠️ **Warning**: Unpublishing is permanent and should only be used in emergencies.

```bash
# Unpublish specific version (within 72 hours)
npm unpublish gemback@0.1.0

# Deprecate a version (preferred)
npm deprecate gemback@0.1.0 "Please upgrade to 0.1.1"
```

## Version History

- `0.1.0` - Initial release (2025-11-22)

## Support

For publishing issues:
- NPM Support: https://docs.npmjs.com/
- GitHub Issues: https://github.com/Laeyoung/gem-back/issues
