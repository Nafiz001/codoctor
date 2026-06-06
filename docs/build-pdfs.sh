#!/usr/bin/env bash
# Regenerate the deliverable PDFs from the markdown sources.
# Requires Node (uses md-to-pdf via npx, which downloads a headless Chromium once).
# Run from the repo root:  bash docs/build-pdfs.sh
set -euo pipefail

OPTS='{"format":"A4","margin":{"top":"12mm","bottom":"12mm","left":"14mm","right":"14mm"}}'

npx --yes md-to-pdf --stylesheet docs/print.css --pdf-options "$OPTS" \
  docs/REPORT.md docs/MODEL_CARD.md

echo "Wrote docs/REPORT.pdf and docs/MODEL_CARD.pdf"
