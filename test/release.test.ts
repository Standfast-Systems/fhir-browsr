import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RELEASE, RELEASES, fitsRelease, isSelectable } from '../src/core/release.ts';

test('only R4 and R5 can be chosen; R4B and R6 show locked, each with a note', () => {
  assert.deepEqual(
    RELEASES.filter((r) => !r.locked).map((r) => r.id),
    ['R4', 'R5'],
  );
  for (const r of RELEASES.filter((r) => r.locked)) assert.ok(r.locked!.note.length > 20, r.id);
  assert.ok(isSelectable(DEFAULT_RELEASE));
  for (const saved of ['R4B', 'R6', 'R7', '', null, 42]) assert.equal(isSelectable(saved), false);
});

test('R4 counts guides published for R4B; other releases match exactly', () => {
  assert.ok(fitsRelease(['R4B'], 'R4'));
  assert.ok(fitsRelease(['R4'], 'R4'));
  assert.ok(!fitsRelease(['R4B'], 'R5'));
  assert.ok(fitsRelease(['R4', 'R5'], 'R5'));
  assert.ok(!fitsRelease(['R5'], 'R4'));
});
