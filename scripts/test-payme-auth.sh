#!/bin/bash
set -euo pipefail
AUTH=$(echo -n 'Paycom:1xoC3KeUKth7g7FHakvNTidRd6QNpHB0Dg@s' | base64 -w0)
curl -s -X POST http://127.0.0.1:3000/api/payme \
  -H 'Content-Type: application/json' \
  -H "Authorization: Basic ${AUTH}" \
  -d '{"id":1,"method":"CheckPerformTransaction","params":{"amount":15000000,"account":{"booking_id":"test-booking-001"}}}'
echo
