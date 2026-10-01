#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="api-project-503305938314"
REGION="us-east1"
SERVICE="steward-copilot-ui"
IMAGE="us-east1-docker.pkg.dev/$PROJECT/cloud-run-source-deploy/$SERVICE:latest"

VITE_API_BASE_URL="https://ai-data-steward-api-503305938314.us-east1.run.app"
VITE_GOOGLE_CLIENT_ID="170978265610-mngvdo2ih7dufc5li8dg7aaoep8vmelt.apps.googleusercontent.com"
VITE_MICROSOFT_CLIENT_ID="9368ff71-a5ed-4dcb-a8fd-ec83e445b206"

[[ "$VITE_API_BASE_URL" == https://* ]] || { echo "Invalid API URL"; exit 1; }
[[ "$VITE_GOOGLE_CLIENT_ID" == *.apps.googleusercontent.com ]] || { echo "Invalid Google client ID"; exit 1; }
[[ -n "$VITE_MICROSOFT_CLIENT_ID" ]] || { echo "Missing Microsoft client ID"; exit 1; }

CONFIG="$(mktemp)"
trap 'rm -f "$CONFIG"' EXIT
cat > "$CONFIG" <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args:
    - 'build'
    - '--build-arg'
    - 'VITE_API_BASE_URL=\${_VITE_API_BASE_URL}'
    - '--build-arg'
    - 'VITE_GOOGLE_CLIENT_ID=\${_VITE_GOOGLE_CLIENT_ID}'
    - '--build-arg'
    - 'VITE_MICROSOFT_CLIENT_ID=\${_VITE_MICROSOFT_CLIENT_ID}'
    - '-t'
    - '$IMAGE'
    - '.'
images:
- '$IMAGE'
EOF

gcloud builds submit . \
  --project="$PROJECT" \
  --region="$REGION" \
  --config="$CONFIG" \
  --substitutions="_VITE_API_BASE_URL=$VITE_API_BASE_URL,_VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID,_VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID"

gcloud run deploy "$SERVICE" \
  --project="$PROJECT" \
  --region="$REGION" \
  --image="$IMAGE"
