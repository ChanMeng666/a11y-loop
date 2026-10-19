/**
 * The pure halves of the checks that judge what an --interact state's action
 * did: focus after a dialog the state closed, focus after a route change, and
 * status messages. The browser halves are covered by the fixture matrix
 * (test/fixtures/manifest.json); these pin the verdicts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  dialogFindings,
  judgeClosedDialog,
  closedDialogFindings,
} from '../../src/lib/checks/dialog.js';
import { judgeRouteFocus, routeFocusFindings, RULE_ID } from '../../src/lib/checks/route-focus.js';
import {
  readsLikeStatus,
  judgeStatusCandidate,
  liveRegionFindings,
  NOT_ANNOUNCED,
  INJECTED_LATE,
  SHORT_TEXT,
} from '../../src/lib/checks/live-region.js';
import { OWN_CHECK_SC } from '../../src/lib/wcag-map.js';
import { SEVERITY, EVIDENCE } from '../../src/lib/finding.js';

const ctx = { passes: ['default'], state: 'some-state' };

describe('dialog: focus after a dialog the state closed', () => {
  const closed = {
    selector: '#subDialog',
    html: '<div role="dialog" id="subDialog">',
    openerKnown: true,
    openerPath: '#openSub',
    openerUsable: true,
    focusLost: true,
  };

  test('focus on the opener, or anywhere real, is not reported', () => {
    assert.equal(judgeClosedDialog({ ...closed, focusLost: false }), null);
    assert.equal(judgeClosedDialog({ ...closed, focusLost: false, openerUsable: false }), null);
    assert.deepEqual(closedDialogFindings([{ ...closed, focusLost: false }], ctx), []);
  });

  test('focus on the body with the opener still there is an inferred violation', () => {
    const [finding] = closedDialogFindings([closed], ctx);
    assert.equal(finding.ruleId, 'dialog-focus-not-returned');
    assert.equal(finding.severity, SEVERITY.VIOLATION);
    assert.equal(finding.evidence, EVIDENCE.INFERRED);
    assert.equal(finding.wcag.sc, '2.4.3');
    assert.equal(finding.data.closedBy, 'state-action');
    assert.match(finding.message, /#openSub/);
  });

  test('focus on the body with the opener gone is still a violation', () => {
    assert.deepEqual(judgeClosedDialog({ ...closed, openerUsable: false }), {
      severity: SEVERITY.VIOLATION,
      reason: 'opener-gone',
    });
  });

  test('an unknown opener makes the row needs-review, never a violation', () => {
    const [finding] = closedDialogFindings([{ ...closed, openerKnown: false, openerPath: null }], ctx);
    assert.equal(finding.severity, SEVERITY.NEEDS_REVIEW);
    assert.equal(finding.evidence, EVIDENCE.NEEDS_REVIEW);
  });
});

describe('dialog: Escape probe focus return', () => {
  const base = {
    selector: '#d',
    html: '<dialog id="d">',
    focusMovedIntoDialog: true,
    focusTrapped: true,
    escapeClosed: true,
  };

  test('a known trigger that did not get focus back is a violation', () => {
    const rows = dialogFindings({ ...base, trigger: '#open', focusReturnedToTrigger: false }, ctx);
    assert.deepEqual(rows.map((f) => [f.ruleId, f.severity]), [['dialog-focus-not-returned', SEVERITY.VIOLATION]]);
  });

  test('a removed trigger gets the opener-gone message', () => {
    const [row] = dialogFindings(
      { ...base, trigger: '#open', focusReturnedToTrigger: false, triggerConnected: false },
      ctx,
    );
    assert.match(row.message, /no longer in the page/);
  });

  test('no trigger and focus on the body is needs-review', () => {
    const rows = dialogFindings(
      { ...base, trigger: null, focusReturnedToTrigger: null, focusOnBodyAfterClose: true },
      ctx,
    );
    assert.deepEqual(rows.map((f) => [f.ruleId, f.severity]), [['dialog-focus-not-returned', SEVERITY.NEEDS_REVIEW]]);
  });

  test('no trigger and focus somewhere real produces nothing', () => {
    const rows = dialogFindings(
      { ...base, trigger: null, focusReturnedToTrigger: null, focusOnBodyAfterClose: false },
      ctx,
    );
    assert.deepEqual(rows, []);
  });
});

describe('route-change-focus-lost', () => {
  const observation = {
    fullLoad: false,
    routeChanged: true,
    via: 'url',
    from: '/orders',
    to: '/orders/1042',
    hadFocusTarget: true,
    focusTargetPath: '#view > ul > li > a',
    focusTargetHtml: '<a href="/orders/1042">',
    focusTargetRemoved: true,
    focusOnBody: true,
    announced: false,
    newHeading: 'Order 1042',
    mainSelector: '#view',
  };

  test('focus lost to the body after a URL change is an inferred violation under 2.4.3', () => {
    const [finding] = routeFocusFindings(observation, ctx);
    assert.equal(finding.ruleId, RULE_ID);
    assert.equal(finding.severity, SEVERITY.VIOLATION);
    assert.equal(finding.evidence, EVIDENCE.INFERRED);
    assert.equal(finding.wcag.sc, '2.4.3');
    assert.match(finding.message, /was removed with the old view/);
  });

  test('focus reset to the body from a control that survived says so', () => {
    const [finding] = routeFocusFindings({ ...observation, focusTargetRemoved: false }, ctx);
    assert.match(finding.message, /moved off the control/);
  });

  test('a view swapped with the URL unchanged is needs-review', () => {
    assert.equal(judgeRouteFocus({ ...observation, via: 'view-replaced' }).severity, SEVERITY.NEEDS_REVIEW);
  });

  for (const [label, change] of [
    ['a full load', { fullLoad: true }],
    ['no route change', { routeChanged: false }],
    ['a scripted change with nothing focused or activated', { hadFocusTarget: false }],
    ['focus moved to the new view', { focusOnBody: false }],
    ['a route announcer in a pre-existing live region', { announced: true }],
  ]) {
    test(`nothing is reported for ${label}`, () => {
      assert.equal(judgeRouteFocus({ ...observation, ...change }), null);
      assert.deepEqual(routeFocusFindings({ ...observation, ...change }, ctx), []);
    });
  }
});

describe('status messages', () => {
  test('status wording is recognised, other text is not', () => {
    for (const text of ['Saved.', 'Added to cart', '3 results', '12', 'Enter a valid email', 'Email is required']) {
      assert.ok(readsLikeStatus(text), text);
    }
    for (const text of ['Order 1042', 'Kawakawa balm, 50 ml', '']) {
      assert.ok(!readsLikeStatus(text), text);
    }
  });

  const candidate = {
    selector: '#profile > p',
    html: '<p>Saved.</p>',
    text: 'Saved. Your display name is updated.',
    textLength: 36,
    near: true,
    activatedPath: '#save',
  };

  test('short status text next to the activated control is a violation', () => {
    assert.equal(judgeStatusCandidate(candidate), SEVERITY.VIOLATION);
  });

  test('any missing confidence signal makes it needs-review', () => {
    assert.equal(judgeStatusCandidate({ ...candidate, near: false }), SEVERITY.NEEDS_REVIEW);
    assert.equal(judgeStatusCandidate({ ...candidate, text: 'Order 1042', textLength: 10 }), SEVERITY.NEEDS_REVIEW);
    assert.equal(judgeStatusCandidate({ ...candidate, textLength: SHORT_TEXT + 1 }), SEVERITY.NEEDS_REVIEW);
  });

  test('findings carry SC 4.1.3 and the inferred tier when they block', () => {
    const [finding] = liveRegionFindings({ armed: true, candidates: [candidate], late: [] }, ctx);
    assert.equal(finding.ruleId, NOT_ANNOUNCED);
    assert.equal(finding.wcag.sc, '4.1.3');
    assert.equal(finding.evidence, EVIDENCE.INFERRED);
  });

  test('a late live region is always needs-review', () => {
    for (const role of ['status', 'alert', null]) {
      const [finding] = liveRegionFindings(
        { armed: true, candidates: [], late: [{ path: '#p > div', html: '<div>', text: 'Added.', role, live: role ? null : 'polite' }] },
        ctx,
      );
      assert.equal(finding.ruleId, INJECTED_LATE);
      assert.equal(finding.severity, SEVERITY.NEEDS_REVIEW);
      assert.equal(finding.wcag.sc, '4.1.3');
    }
  });

  test('a route change silences both status-message checks', () => {
    const observation = {
      armed: true,
      candidates: [candidate],
      late: [{ path: '#p > div', html: '<div>', text: 'Added.', role: 'status', live: null }],
    };
    assert.deepEqual(liveRegionFindings(observation, { ...ctx, routeChanged: true }), []);
  });

  test('an unarmed recorder reports nothing', () => {
    assert.deepEqual(liveRegionFindings({ armed: false, candidates: [candidate], late: [] }, ctx), []);
    assert.deepEqual(liveRegionFindings(null, ctx), []);
  });
});

describe('OWN_CHECK_SC', () => {
  test('maps every new state check to a known criterion', () => {
    assert.deepEqual(OWN_CHECK_SC, {
      'route-change-focus-lost': '2.4.3',
      'status-message-not-announced': '4.1.3',
      'live-region-injected-late': '4.1.3',
    });
  });
});
