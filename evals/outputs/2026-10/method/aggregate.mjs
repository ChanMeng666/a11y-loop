// Aggregates a11y-loop, IBM Equal Access and Lighthouse results per arm/run/file.
import fs from 'node:fs'; import path from 'node:path';
const B = 'D:/.claude-scratch/2026-10-20/bench';
const FILES = ['signup-form','pricing','gallery','header-nav','newsletter-modal','dashboard'];
const arms = [];
for (const a of ['baseline-clean','skilled-clean','baseline','skilled']) for (const n of [1,2,3]) arms.push({ arm: `2026-10-${a}`, run: n, rel: `${a}/run-${n}`, tag: `2026-10-${a}-run-${n}` });
for (const a of ['baseline','skilled']) arms.push({ arm: `2026-07-${a}`, run: 1, rel: `2026-07/${a}`, tag: `2026-07-${a}` });
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const rows = [];
for (const A of arms) for (const f of FILES) {
  const al = read(`${B}/audits/${A.tag}/${f}.json`);
  const first = A.arm.includes('skilled') && !A.arm.startsWith('2026-07') ? read(`${B}/${A.rel}/reports/${f}.run1.json`) : null;
  const ibm = read(`${B}/oracle-ibm/results/127.0.0.1_8765/${A.rel}/${f}.html.json`);
  const lh = read(`${B}/oracle-lh/${A.rel.replace(/\//g,'__')}__${f}.json`);
  const ibmV = ibm ? ibm.results.filter(r => r.level === 'violation') : null;
  const lhFail = lh ? Object.values(lh.audits).filter(a => lh.categories.accessibility.auditRefs.some(r => r.id === a.id && r.weight > 0) && a.score === 0) : null;
  rows.push({
    arm: A.arm, run: A.run, file: f,
    al: al ? { v: al.summary.violations, nr: al.summary.needsReview, manual: al.summary.manualChecklist, rules: [...new Set(al.findings.violations.map(x => x.ruleId))], nrRules: [...new Set(al.findings.needsReview.map(x => x.ruleId))], passes: al.tool.passesRun, states: al.tool.statesRun } : null,
    alFirst: first ? { v: first.summary.violations, nr: first.summary.needsReview, rules: [...new Set(first.findings.violations.map(x => x.ruleId))] } : null,
    ibm: ibm ? { v: ibmV.length, pv: ibm.summary.counts.potentialviolation, manual: ibm.summary.counts.manual, rules: [...new Set(ibmV.map(r => r.ruleId))], items: ibmV.map(r => ({ rule: r.ruleId, reason: r.reasonId, msg: r.message, snippet: r.snippet.slice(0, 160) })) } : null,
    lh: lh ? { failedAudits: lhFail.length, failingNodes: lhFail.reduce((s, a) => s + (a.details?.items?.length || 1), 0), rules: lhFail.map(a => a.id), items: lhFail.map(a => ({ rule: a.id, nodes: (a.details?.items || []).map(i => i.node?.snippet?.slice(0, 160)) })), version: lh.lighthouseVersion, ua: lh.environment?.hostUserAgent } : null,
  });
}
fs.writeFileSync(`${B}/aggregate.json`, JSON.stringify(rows, null, 1));
// Summary per arm
const stat = (xs) => xs.length ? { mean: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2), min: Math.min(...xs), max: Math.max(...xs), total: xs.reduce((a, b) => a + b, 0), n: xs.length } : null;
const out = {};
for (const arm of [...new Set(rows.map(r => r.arm))]) {
  const R = rows.filter(r => r.arm === arm);
  const g = (fn) => stat(R.map(fn).filter(x => x != null));
  out[arm] = {
    files: R.length,
    alV: g(r => r.al?.v), alNR: g(r => r.al?.nr), alManual: g(r => r.al?.manual), alFirstV: g(r => r.alFirst?.v), alFirstNR: g(r => r.alFirst?.nr),
    ibmV: g(r => r.ibm?.v), ibmPV: g(r => r.ibm?.pv), lhFailedAudits: g(r => r.lh?.failedAudits), lhFailingNodes: g(r => r.lh?.failingNodes),
    filesWithAnyIbmV: R.filter(r => r.ibm?.v > 0).length, filesWithAnyLhFail: R.filter(r => r.lh?.failedAudits > 0).length, filesWithAnyAlV: R.filter(r => r.al?.v > 0).length,
    ibmRules: Object.entries(R.flatMap(r => r.ibm?.items || []).reduce((m, i) => (m[i.rule] = (m[i.rule] || 0) + 1, m), {})),
    lhRules: Object.entries(R.flatMap(r => r.lh?.rules || []).reduce((m, i) => (m[i] = (m[i] || 0) + 1, m), {})),
    alRules: Object.entries(R.flatMap(r => r.al?.rules || []).reduce((m, i) => (m[i] = (m[i] || 0) + 1, m), {})),
  };
}
fs.writeFileSync(`${B}/summary.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
