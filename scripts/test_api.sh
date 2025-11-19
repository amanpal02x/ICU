#!/usr/bin/env bash
set -euo pipefail

API_URL="$1"
API_TEST_TOKEN="${2:-}"

if [ -z "$API_URL" ]; then
  echo "Usage: test_api.sh <API_URL> [API_TEST_TOKEN]"
  exit 2
fi

echo "Testing health endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
echo "Health HTTP status: $HTTP_STATUS"
if [ "$HTTP_STATUS" != "200" ]; then
  echo "Health check failed!"
  exit 3
fi
echo "Health OK."

echo "Testing protected endpoint WITHOUT token (expected 401/403)..."
STATUS_NO_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/")
echo "Status without token: $STATUS_NO_TOKEN"

if [ "$STATUS_NO_TOKEN" = "200" ]; then
  echo "Warning: protected endpoint returned 200 without token — authorizer may not be active."
else
  echo "No-token response code: $STATUS_NO_TOKEN (expected 401 or 403)."
fi

if [ -n "$API_TEST_TOKEN" ]; then
  echo "Testing protected endpoint WITH provided token..."
  STATUS_WITH_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${API_TEST_TOKEN}" "${API_URL}/")
  echo "Status with token: $STATUS_WITH_TOKEN"
  if [ "$STATUS_WITH_TOKEN" != "200" ]; then
    echo "Protected endpoint did not return 200 with provided token (got $STATUS_WITH_TOKEN)."
    exit 4
  fi
  echo "Protected endpoint OK with provided token."
else
  echo "No API_TEST_TOKEN provided — skipping protected-endpoint-with-token test. To test that, add a valid OIDC access token to the API_TEST_TOKEN secret."
fi
