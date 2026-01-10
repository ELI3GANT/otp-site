#!/bin/bash
# scripts/start_hotfix.sh

echo "🔥 INITIATING HOTFIX WORKFLOW..."

# 1. Fetch latest tags
git fetch --tags

# 2. Get latest version tag
LATEST_TAG=$(git describe --tags `git rev-list --tags --max-count=1`)

if [ -z "$LATEST_TAG" ]; then
    echo "❌ Error: No tags found. Cannot start hotfix."
    exit 1
fi

echo "📍 Latest Stable Release: $LATEST_TAG"

# 3. Calculate new version (simple patch increment logic or manual)
# For safety, we'll ask the user, defaulting to patch increment is complex in bash without semver tool
read -p "Enter new Hotfix Version (e.g. v1.0.1): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo "❌ Error: Version required."
    exit 1
fi

# 4. Create Branch
git checkout $LATEST_TAG
git checkout -b hotfix-$NEW_VERSION

echo ""
echo "✅ Hotfix Branch 'hotfix-$NEW_VERSION' Created!"
echo "👉 You are now isolated from 'main'. Make your fixes, run tests, and commit."
