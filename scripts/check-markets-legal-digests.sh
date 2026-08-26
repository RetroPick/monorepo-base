#!/usr/bin/env bash
set -euo pipefail

terms_path="docs/markets-v1/legal/Terms.md"
privacy_path="docs/markets-v1/legal/PrivacyPolicy.md"
terms_expected="c8fd7427d81c4d0ffa1f6ee0c8a0a879eed2dea82a7da4a670f343bd9cec3b44"
privacy_expected="4f9307d96d4a04d20fc58ad8fd3867281bf3a39ec280ffb99d823df11dedf818"

for path in "$terms_path" "$privacy_path"; do
  if [[ ! -f "$path" ]]; then
    echo "Missing canonical legal document: $path" >&2
    exit 1
  fi
done

terms_actual="$(sha256sum "$terms_path" | awk '{print $1}')"
privacy_actual="$(sha256sum "$privacy_path" | awk '{print $1}')"

if [[ "$terms_actual" != "$terms_expected" ]]; then
  echo "Terms SHA-256 mismatch: got $terms_actual expected $terms_expected" >&2
  exit 1
fi

if [[ "$privacy_actual" != "$privacy_expected" ]]; then
  echo "Privacy SHA-256 mismatch: got $privacy_actual expected $privacy_expected" >&2
  exit 1
fi

echo "Markets legal digest preservation: PASS"
echo "Terms SHA-256: $terms_actual"
echo "Privacy SHA-256: $privacy_actual"
