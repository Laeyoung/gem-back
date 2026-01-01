#!/bin/bash

# v0.5.0 Integration Tests Runner
# This script runs all integration tests for gemback

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Gem Back v0.5.0 - Integration Tests Runner               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if package is built
PACKAGE_PATH=$(find .. -maxdepth 1 -name "gemback-*.tgz" | head -n 1)

if [ -z "$PACKAGE_PATH" ]; then
    echo "❌ Package not found: gemback-*.tgz"
    echo "Please run 'npm run build && npm pack' in the root directory first"
    exit 1
fi

# Extract package filename from path
PACKAGE_FILE=$(basename "$PACKAGE_PATH")

echo "✅ Package found: $PACKAGE_FILE"
echo ""

# Function to update package.json with current package version
update_package_json() {
    local pkg_json="$1"

    if [ ! -f "$pkg_json" ]; then
        echo "⚠️  Warning: $pkg_json not found"
        return 1
    fi

    # Create backup
    cp "$pkg_json" "$pkg_json.bak"

    # Update gemback dependency using sed
    # This works on both macOS and Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS requires -i with extension
        sed -i '.tmp' -E 's|"gemback": "file:../../gemback-.*\.tgz"|"gemback": "file:../../'"$PACKAGE_FILE"'"|' "$pkg_json"
        rm -f "$pkg_json.tmp"
    else
        # Linux
        sed -i -E 's|"gemback": "file:../../gemback-.*\.tgz"|"gemback": "file:../../'"$PACKAGE_FILE"'"|' "$pkg_json"
    fi

    echo "   ✓ Updated package.json to use $PACKAGE_FILE"
}

# Function to run test in a directory
run_test() {
    local dir=$1
    local name=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Testing: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    cd "$dir"

    # Update package.json to use current package version
    echo "Updating package.json..."
    update_package_json "package.json"

    # Clean previous installation to avoid EINTEGRITY errors with local tarball
    echo "Cleaning previous installation..."
    rm -rf node_modules package-lock.json

    # Install dependencies
    echo "Installing dependencies..."
    if npm install > /dev/null 2>&1; then
        echo "   ✓ Dependencies installed"
    else
        echo "   ❌ Failed to install dependencies"
        # Restore backup
        if [ -f "package.json.bak" ]; then
            mv package.json.bak package.json
        fi
        cd - > /dev/null
        return 1
    fi

    # Install gemback package
    echo "Installing gemback package..."
    if npm install "../../$PACKAGE_FILE" > /dev/null 2>&1; then
        echo "   ✓ Gemback package installed"
    else
        echo "   ❌ Failed to install gemback package"
        # Restore backup
        if [ -f "package.json.bak" ]; then
            mv package.json.bak package.json
        fi
        cd - > /dev/null
        return 1
    fi

    # Remove backup after successful installation
    rm -f package.json.bak

    # Run basic test
    echo "Running basic test..."
    npm test

    # Run full test if API key is available
    if [ -n "$GEMINI_API_KEY" ]; then
        echo ""
        echo "Running full feature test with API key..."
        # Run with .env.local if it exists, otherwise run directly (CI)
        if [ -f "../../.env.local" ]; then
            if [ -f "../../node_modules/.bin/dotenv" ]; then
                ../../node_modules/.bin/dotenv -f ../../.env.local -- npm run test:all
            else
                # Fallback for when node_modules location might differ or global install
                npx dotenv -f ../../.env.local -- npm run test:all
            fi
        else
            npm run test:all
        fi
    else
        echo ""
        echo "⚠️  GEMINI_API_KEY not set - skipping full feature tests"
    fi

    cd - > /dev/null
    echo ""
}

# Run tests
run_test "commonjs-test" "CommonJS Environment"
run_test "esm-test" "ESM Environment"
run_test "typescript-test" "TypeScript Environment"

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Test Summary                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ CommonJS test passed"
echo "✅ ESM test passed"
echo "✅ TypeScript test passed"
echo ""

if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Note: Full feature tests were skipped"
    echo "   To run full tests, set GEMINI_API_KEY environment variable:"
    echo "   export GEMINI_API_KEY=your_api_key"
    echo ""
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🎉 All Integration Tests Passed! 🎉                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Review test output above"
echo "  2. Check TEST_SCENARIOS.md for detailed test cases"
echo "  3. Verify README.md examples work"
echo "  4. Ready to publish! 🚀"
echo ""
