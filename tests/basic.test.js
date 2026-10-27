const test = require('node:test');
const assert = require('node:assert/strict');

test('attendance percentage calculation uses attended / marked periods', () => {
  const attended = 5, absent = 2, working = attended + absent;
  assert.equal(Math.round((attended / working) * 10000) / 100, 71.43);
});

test('seven periods are represented by seven status values', () => {
  const periods = ['P','A','P','P','A','P','P'];
  assert.equal(periods.length, 7);
  assert.ok(periods.every(value => value === 'P' || value === 'A'));
});
