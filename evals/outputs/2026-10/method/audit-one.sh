#!/bin/bash
export PLAYWRIGHT_BROWSERS_PATH='D:\playwright-browsers'
dir=$1; f=$2; tag=$3; out=/d/.claude-scratch/2026-10-20/bench/audits/$tag
mkdir -p $out
args=""
[ -f $dir/$f.states.mjs ] && args="--interact $dir/$f.states.mjs"
node /d/github_repository/a11y-loop/.claude/worktrees/bench/src/cli.js audit --file $dir/$f.html $args --out $out/$f.json --quiet > $out/$f.log 2>&1
echo "$tag $f exit=$? $(cat $out/$f.log | tail -1)"
