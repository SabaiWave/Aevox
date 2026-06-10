#!/bin/bash
# SBW lint-on-save hook
# Fires after every file edit. Auto-formats the saved file.

FILE=$1

if [[ "$FILE" =~ \.(ts|tsx)$ ]]; then
  npx eslint "$FILE" --fix --quiet 2>/dev/null
fi

exit 0
