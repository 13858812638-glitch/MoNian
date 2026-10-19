#!/usr/bin/env bash
cd /mnt/data/GLS-Stability1-NoKeyboardFollow-work || exit 1
run() {
  label="$1";shift
  echo "START $label $(date -Is)" >> reports/no-follow-final-summary.log
  "$@" > "reports/no-follow-final-${label}.log" 2>&1
  ec=$?
  echo "END $label $ec $(date -Is)" >> reports/no-follow-final-summary.log
}
run focus-repair env REPAIR_SIDES=B REPAIR_THEMES=light,dark npm run test:focus-repair
run feishu npm run test:feishu-focus
run picker-caret env CHROMIUM_PATH=/usr/bin/chromium npm run test:picker-caret
run picker-portal env CHROMIUM_PATH=/usr/bin/chromium PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal
run check npm run check
run build npm run build
echo DONE >> reports/no-follow-final-summary.log
