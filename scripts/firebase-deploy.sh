#!/usr/bin/env bash
set -euo pipefail

: "${FIREBASE_TOKEN:?FIREBASE_TOKEN is required}"
PROJECT_ID="${1:-bird-af69c}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install with: npm i -g firebase-tools"
  exit 1
fi

firebase use "$PROJECT_ID" --token "$FIREBASE_TOKEN"
firebase deploy --only firestore:rules,firestore:indexes,functions --token "$FIREBASE_TOKEN"
