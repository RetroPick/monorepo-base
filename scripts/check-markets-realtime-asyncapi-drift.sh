#!/usr/bin/env bash
# CI drift gate: AsyncAPI realtime contract must be present and valid YAML.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/schemas/asyncapi/markets-realtime-v1.yaml"
if [ ! -f "$SCHEMA" ]; then
  echo "ERROR: missing $SCHEMA"
  exit 1
fi
python3 -c "
import yaml, sys
with open('$SCHEMA') as f:
    doc = yaml.safe_load(f)
assert doc.get('asyncapi', '').startswith('3.'), 'expected AsyncAPI 3.x'
assert 'RealtimeEnvelope' in doc.get('components', {}).get('schemas', {}), 'missing RealtimeEnvelope'
env = doc['components']['schemas']['RealtimeEnvelope']
props = env.get('properties', {})
assert props.get('sequence', {}).get('type') == 'null', 'sequence must be null type'
assert 'streamEpoch' in props and 'deliveryCounter' in props, 'missing transport metadata'
print('Markets AsyncAPI realtime drift check: PASS')
"
