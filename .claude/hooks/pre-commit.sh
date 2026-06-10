#!/bin/bash
# SBW pre-commit hook
# Runs on every commit. Blocks if anything fails.

RED="\033[0;31m"
GREEN="\033[0;32m"
NC="\033[0m"

# Step 1: TypeScript type check
echo "Checking types..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo -e "${RED}Type errors found. Fix before committing.${NC}"
  exit 2
fi

# Step 2: ESLint on staged .ts/.tsx files
STAGED=$(git diff --cached --name-only --diff-filter=d | grep -E "\.(ts|tsx)$")
if [ -n "$STAGED" ]; then
  echo "Linting staged files..."
  npx eslint $STAGED --quiet
  if [ $? -ne 0 ]; then
    echo -e "${RED}Lint errors. Run npm run lint to see details.${NC}"
    exit 2
  fi
fi

echo -e "${GREEN}All checks passed.${NC}"
exit 0
