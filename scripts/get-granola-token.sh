#!/bin/bash
# Extracts Granola tokens from local app storage and prints env var values.
# Run this when deploying or when GRANOLA_REFRESH_TOKEN needs refreshing.
#
# Usage:
#   bash scripts/get-granola-token.sh
#   # Then paste the output into your .env.local or Vercel env vars

GRANOLA_JSON="$HOME/Library/Application Support/Granola/supabase.json"

if [ ! -f "$GRANOLA_JSON" ]; then
  echo "ERROR: Granola app data not found at $GRANOLA_JSON"
  echo "Make sure Granola is installed and you have signed in."
  exit 1
fi

python3 - <<'EOF'
import json, sys, os

path = os.path.expanduser("~/Library/Application Support/Granola/supabase.json")
with open(path) as f:
    data = json.load(f)

wt = json.loads(data['workos_tokens'])
print(f"GRANOLA_REFRESH_TOKEN={wt['refresh_token']}")
print(f"# Access token (short-lived, not needed — app uses refresh token):")
print(f"# GRANOLA_ACCESS_TOKEN={wt['access_token'][:40]}...")
EOF
