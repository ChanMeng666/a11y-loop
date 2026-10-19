#!/bin/bash
B=/d/.claude-scratch/2026-10-20/bench; rel=$1; f=$2; out="$B/oracle-lh/${rel//\//__}__$f.json"
for try in 1 2; do
npx --prefix $B/oracles-install lighthouse "http://127.0.0.1:8765/$rel/$f.html" --only-categories=accessibility --output=json --output-path="$out" --chrome-path='D:\playwright-browsers\chromium-1248\chrome-win64\chrome.exe' --chrome-flags="--headless=new --no-sandbox" --quiet >/dev/null 2>>$B/oracle-lh/lh-err2.log && { echo "ok $rel $f"; exit 0; }
done; echo "FAIL $rel $f"
