#!/usr/bin/env bash
cd /mnt/data/GLS-Stability1-NoKeyboardFollow-work || exit 1
run() {
  label="$1"; shift
  echo "START $label $(date -Is)" >> reports/no-follow-summary.log
  "$@" > "reports/no-follow-${label}.log" 2>&1
  rc=$?
  echo "END $label $rc $(date -Is)" >> reports/no-follow-summary.log
}
run focus npm run test:focus
run focus-repair npm run test:focus-repair
run feishu npm run test:feishu-focus
run picker-caret npm run test:picker-caret
run picker-portal env PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal
run browser npm run test:browser
run acceptance npm run test:acceptance
run audit npm run audit:source
echo DONE >> reports/no-follow-summary.log
