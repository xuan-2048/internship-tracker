const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const helpers = vm.createContext({Date});
vm.runInContext(readFileSync(join(__dirname, '../frontend/tasks.js'), 'utf8'), helpers);

const task = (id, due, extra = {}) => ({id, next_step: 'Prepare', next_step_due_date: due, next_step_done: false, status: 'interview', ...extra});

test('due view includes overdue dates, today, and the seven-day boundary', () => {
  const rows = [task(1, '2026-11-06'), task(2, '2026-11-04'), task(3, '2026-11-12'), task(4, '2026-11-13'), task(5, '')];
  assert.deepEqual(Array.from(helpers.dueTasks(rows, 'upcoming', '2026-11-05'), row => row.id), [2, 1, 3]);
  assert.equal(helpers.taskState(rows[1], '2026-11-05'), 'overdue');
  assert.equal(helpers.taskState(task(6, '2026-11-05'), '2026-11-05'), 'dueToday');
});

test('completed and closed applications stay out of pending tasks', () => {
  const rows = [task(1, '2026-11-05', {next_step_done: true}), task(2, '2026-11-05', {status: 'rejected'}), task(3, '2026-11-05', {status: 'withdrawn'}), task(4, '2026-11-05', {status: 'offer'})];
  assert.deepEqual(Array.from(helpers.dueTasks(rows, 'today', '2026-11-05'), row => row.id), [4]);
  assert.deepEqual(Array.from(helpers.dueTasks(rows, 'completed', '2026-11-05'), row => row.id), [1]);
});

test('calendar dates remain local around midnight and daylight-saving changes', () => {
  assert.equal(helpers.localDateString(new Date(2026, 10, 5, 23, 59)), '2026-11-05');
  assert.equal(helpers.localDateString(new Date(2026, 10, 6, 0, 1)), '2026-11-06');
  const rows = [task(1, '2026-11-05'), task(2, '2026-11-06')];
  assert.deepEqual(Array.from(helpers.dueTasks(rows, 'upcoming', '2026-10-29'), row => row.id), [1]);
});
