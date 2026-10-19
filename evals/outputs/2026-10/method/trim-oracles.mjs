// Trims IBM and Lighthouse JSON to what the report tables use, and renames
// scratch arm paths to their published paths under evals/outputs/.
import fs from 'node:fs'; import path from 'node:path';
const [B, O] = process.argv.slice(2);
const map = { 'baseline-clean': 'baseline', 'skilled-clean': 'skilled', 'baseline': 'agent-tool/baseline', 'skilled': 'agent-tool/skilled' };
const pub = (rel) => rel.startsWith('2026-07/') ? rel : rel.replace(/^([a-z-]+)\//, (m, a) => map[a] + '/');
const FILES = ['signup-form','pricing','gallery','header-nav','newsletter-modal','dashboard'];
const rels = [];
for (const a of Object.keys(map)) for (const n of [1,2,3]) rels.push(`${a}/run-${n}`);
rels.push('2026-07/baseline', '2026-07/skilled');
const ibmOut = {}, lhOut = {};
for (const rel of rels) for (const f of FILES) {
  const key = `${pub(rel)}/${f}.html`;
  const ibm = JSON.parse(fs.readFileSync(`${B}/oracle-ibm/results/127.0.0.1_8765/${rel}/${f}.html.json`, 'utf8'));
  ibmOut[key] = { counts: ibm.summary.counts, ruleArchive: ibm.summary.ruleArchive, policies: ibm.summary.policies, toolID: ibm.toolID,
    results: ibm.results.filter(r => ['violation','potentialviolation'].includes(r.level)).map(r => ({ ruleId: r.ruleId, reasonId: r.reasonId, level: r.level, message: r.message, xpath: r.path?.dom, snippet: r.snippet })) };
  const lh = JSON.parse(fs.readFileSync(`${B}/oracle-lh/${rel.replace(/\//g,'__')}__${f}.json`, 'utf8'));
  const refs = lh.categories.accessibility.auditRefs;
  lhOut[key] = { lighthouseVersion: lh.lighthouseVersion, axeCore: lh.environment?.credits?.['axe-core'], hostUserAgent: lh.environment?.hostUserAgent, formFactor: lh.configSettings?.formFactor, screenEmulation: lh.configSettings?.screenEmulation,
    failed: refs.filter(r => r.weight > 0 && lh.audits[r.id].score === 0).map(r => ({ id: r.id, title: lh.audits[r.id].title, nodes: (lh.audits[r.id].details?.items || []).map(i => i.node?.snippet) })),
    manual: refs.filter(r => lh.audits[r.id].scoreDisplayMode === 'manual').map(r => r.id),
    notApplicable: refs.filter(r => lh.audits[r.id].scoreDisplayMode === 'notApplicable').length };
}
fs.mkdirSync(`${O}/oracles`, { recursive: true });
fs.writeFileSync(`${O}/oracles/ibm-equal-access.json`, JSON.stringify(ibmOut, null, 1));
fs.writeFileSync(`${O}/oracles/lighthouse.json`, JSON.stringify(lhOut, null, 1));
console.log(Object.keys(ibmOut).length, Object.keys(lhOut).length);
