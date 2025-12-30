#!/bin/bash

# v0.4.0 Integration Tests Runner
# This script runs all integration tests for gemback

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Gem Back v0.4.0 - Integration Tests Runner               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if package is built
PACKAGE_FILE=$(find .. -maxdepth 1 -name "gemback-*.tgz" | head -n 1)

if [ -z "$PACKAGE_FILE" ]; then
    echo "❌ Package not found: gemback-*.tgz"
    echo "Please run 'npm run build && npm pack' in the root directory first"
    exit 1
fi

echo "✅ Package found: $PACKAGE_FILE"
echo ""

# Function to run test in a directory
run_test() {
    local dir=$1
    local name=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Testing: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    cd "$dir"

    # Clean previous installation to avoid EINTEGRITY errors with local tarball
    rm -rf node_modules package-lock.json

    # Install dependencies
    echo "Installing dependencies..."
    npm install > /dev/null 2>&1

    # Install gemback package
    echo "Installing gemback package..."
    npm install ../$PACKAGE_FILE > /dev/null 2>&1

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
