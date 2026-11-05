// Calendar dates use the user's local day, avoiding UTC and daylight-saving shifts.
function localDateString(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function taskState(application, today = localDateString()) {
  if (application.next_step_done) return 'completed';
  if (!application.next_step_due_date) return 'unscheduled';
  if (application.next_step_due_date < today) return 'overdue';
  if (application.next_step_due_date === today) return 'dueToday';
  return 'upcoming';
}

function dueTasks(applications, filter = 'upcoming', today = localDateString()) {
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + 7);
  const lastDay = localDateString(end);
  return applications.filter(application => {
    if (!application.next_step) return false;
    if (filter === 'completed') return application.next_step_done;
    if (application.next_step_done || ['rejected', 'withdrawn'].includes(application.status)) return false;
    const due = application.next_step_due_date;
    if (!due) return false;
    if (filter === 'overdue') return due < today;
    if (filter === 'today') return due === today;
    return due <= lastDay; // Includes overdue tasks so they cannot silently disappear.
  }).sort((a, b) => (a.next_step_due_date || '9999').localeCompare(b.next_step_due_date || '9999') || a.id - b.id);
}
