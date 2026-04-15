#!/usr/bin/env bash
# ============================================================
# SafeRoute AI — Google Cloud Run Deployment
# ============================================================
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. A GCP project with billing enabled
#   3. APIs enabled: Cloud Run, Cloud Build, Artifact Registry
#   4. Environment variables set:
#        export GOOGLE_MAPS_API_KEY="your-maps-key"
#        export GEMINI_API_KEY="your-gemini-key"
# ============================================================

set -euo pipefail

# ── Configuration ──
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
SERVICE_NAME="saferoute-ai"
REGION="asia-south1"     # Mumbai — closest to Bengaluru users
MEMORY="256Mi"
MAX_INSTANCES=3

echo "═══════════════════════════════════════════════"
echo "  SafeRoute AI — Cloud Run Deployment"
echo "═══════════════════════════════════════════════"
echo "  Project:  $PROJECT_ID"
echo "  Service:  $SERVICE_NAME"
echo "  Region:   $REGION"
echo "═══════════════════════════════════════════════"

# ── Validate env vars ──
if [ -z "${GOOGLE_MAPS_API_KEY:-}" ]; then
  echo "ERROR: GOOGLE_MAPS_API_KEY is not set"
  exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "ERROR: GEMINI_API_KEY is not set"
  exit 1
fi

# ── Enable required APIs ──
echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --quiet

# ── Deploy ──
echo "Building and deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY,GEMINI_API_KEY=$GEMINI_API_KEY" \
  --port 8080 \
  --memory "$MEMORY" \
  --max-instances "$MAX_INSTANCES" \
  --quiet

# ── Output URL ──
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format "value(status.url)")
echo ""
echo "═══════════════════════════════════════════════"
echo "  ✓ Deployed successfully!"
echo "  URL: $SERVICE_URL"
echo "═══════════════════════════════════════════════"
echo ""
echo "NEXT STEPS:"
echo "  1. Restrict your Maps API key to HTTP referrer: $SERVICE_URL/*"
echo "  2. Test at: $SERVICE_URL"
