const statusCodes = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected', 'withdrawn'];
const fields = ['company', 'role', 'url', 'status', 'applied_date', 'deadline', 'next_step', 'notes', 'next_step_due_date', 'next_step_done'];
const $ = (selector) => document.querySelector(selector);
let applications = [];
let editingId = null;
let toastTimer;
let toastError = null;
let busy = false;

let formError = null;
let loadError = null;
let loaded = false;

function updateLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = t('title');
  document.querySelector('meta[name="description"]').content = t('description');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  for (const selector of ['#status-filter', '#form-status']) {
    const select = $(selector);
    const selected = select.value;
    select.replaceChildren();
    if (selector === '#status-filter') select.add(new Option(t('allStatuses'), ''));
    for (const value of statusCodes) select.add(new Option(t(value), value));
    select.value = selected || (selector === '#form-status' ? 'saved' : '');
  }
  document.querySelectorAll('[data-i18n-option]').forEach(node => { node.textContent = t(node.dataset.i18nOption); });
  for (const selector of ['#language-select', '#form-language-select']) $(selector).value = language;
  $('#dialog-title').textContent = t(editingId ? 'editTitle' : 'addTitle');
  $('#save-button').textContent = t(busy ? 'saving' : 'save');
  if (formError) $('#form-error').textContent = translatedError(formError.message);
  if (loadError) {
    $('#result-count').textContent = t('loadFailed');
    $('#load-error').textContent = t('loadError', {error: translatedError(loadError.message)});
  } else if (loaded) render();
  else $('#result-count').textContent = t('loading');
  if (toastError) $('#toast').textContent = translatedError(toastError.message);
  else if ($('#toast').dataset.key) $('#toast').textContent = t($('#toast').dataset.key);
}


async function api(path = '', options = {}) {
  const response = await fetch(`/api/applications${path}`, {
    ...options,
    headers: {'Content-Type': 'application/json', ...options.headers},
  }).catch(() => { throw new Error(messages.networkError[0]); });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || messages.genericError[0]);
  return body;
}

function toast(key, error = null) {
  toastError = error;
  clearTimeout(toastTimer);
  $('#toast').dataset.key = error ? '' : key;
  $('#toast').textContent = error ? translatedError(error.message) : t(key);
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render() {
  renderTasks();
  $('#total-count').textContent = applications.length;
  $('#active-count').textContent = applications.filter(a => ['applied', 'assessment', 'interview'].includes(a.status)).length;
  $('#interview-count').textContent = applications.filter(a => a.status === 'interview').length;
  $('#offer-count').textContent = applications.filter(a => a.status === 'offer').length;
  const query = $('#search').value.trim().toLocaleLowerCase();
  const status = $('#status-filter').value;
  const rows = applications.filter(a => (!status || a.status === status)
    && (!$('#action-filter').checked || a.next_step)
    && [a.company, a.role, a.notes].some(s => s.toLocaleLowerCase().includes(query)));
  $('#result-count').textContent = t('count', {shown: rows.length, total: applications.length});
  $('#application-list').replaceChildren();
  for (const application of rows) {
    const tr = document.createElement('tr');
    const job = document.createElement('td');
    const identity = element('div', undefined, 'job-identity');
    identity.append(element('span', application.company.slice(0, 1).toUpperCase(), 'company-icon'));
    const text = document.createElement('div');
    const company = element(application.url ? 'a' : 'strong', application.company, 'company-name');
    if (application.url) {
      company.href = application.url;
      company.target = '_blank';
      company.rel = 'noopener noreferrer';
    }
    text.append(company, element('span', application.role, 'role-name'));
    identity.append(text);
    job.append(identity);
    const progress = document.createElement('td');
    const select = element('select', undefined, `status-select ${application.status}`);
    select.setAttribute('aria-label', t('statusFor', {company: application.company}));
    for (const value of statusCodes) select.add(new Option(t(value), value));
    select.value = application.status;
    select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        const payload = Object.fromEntries(fields.map(key => [key, application[key]]));
        payload.status = select.value;
        const updated = await api(`/${application.id}`, {method: 'PUT', body: JSON.stringify(payload)});
        applications = applications.map(a => a.id === updated.id ? updated : a);
        render();
        toast('statusUpdated');
      } catch (error) {
        select.value = application.status;
        toast(null, error);
      } finally { select.disabled = false; }
    });
    progress.append(select);
    const step = document.createElement('td');
    step.append(element('span', application.next_step || t('noNext'), application.next_step ? 'next-step' : 'muted'));
    if (application.next_step_due_date) step.append(element('small', t('taskDueOn', {date: application.next_step_due_date}), 'deadline'));
    if (application.next_step_done) step.append(element('small', t('completed'), 'task-completed-label'));
    if (application.deadline) step.append(element('small', t('applyBy', {date: application.deadline}), 'deadline'));
    const actions = document.createElement('td');
    const edit = element('button', t('edit'), 'text-button');
    edit.setAttribute('aria-label', t('editFor', {company: application.company}));
    edit.addEventListener('click', () => openForm(application));
    const remove = element('button', t('delete'), 'text-button delete-button');
    remove.setAttribute('aria-label', t('deleteFor', {company: application.company}));
    remove.addEventListener('click', async () => {
      if (!window.confirm(t('confirmDelete', {role: application.role, company: application.company}))) return;
      remove.disabled = true;
      try {
        await api(`/${application.id}`, {method: 'DELETE'});
        applications = applications.filter(a => a.id !== application.id);
        render();
        toast('deleted');
      } catch (error) { toast(null, error); remove.disabled = false; }
    });
    actions.append(edit, remove);
    tr.append(job, progress, element('td', application.applied_date || '—', 'date-cell'), step, actions);
    $('#application-list').append(tr);
  }
  $('.table-wrap').hidden = rows.length === 0;
  $('#empty-state').hidden = rows.length !== 0;
  $('#empty-title').textContent = t(applications.length ? 'noMatches' : 'emptyTitle');
  $('#empty-description').textContent = t(applications.length ? 'adjustFilters' : 'emptyDescription');
  $('#empty-add').hidden = applications.length > 0;
}

function openForm(application = null) {
  editingId = application?.id ?? null;
  $('#application-form').reset();
  $('#form-language-select').value = language;
  formError = null;
  $('#form-error').hidden = true;
  $('#dialog-title').textContent = t(editingId ? 'editTitle' : 'addTitle');
  if (application) for (const key of fields) {
    const input = $('#application-form').elements[key];
    if (key === 'next_step_done') input.checked = application[key];
    else input.value = application[key];
  }
  $('#application-dialog').showModal();
}

$('#application-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const payload = Object.fromEntries(new FormData(event.target));
  payload.next_step_done = event.target.elements.next_step_done.checked;
  busy = true;
  $('#save-button').disabled = true;
  $('#save-button').textContent = t('saving');
  formError = null;
  $('#form-error').hidden = true;
  try {
    const updated = await api(editingId ? `/${editingId}` : '', {method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload)});
    applications = editingId ? applications.map(a => a.id === updated.id ? updated : a) : [updated, ...applications];
    $('#application-dialog').close();
    render();
    toast(editingId ? 'updated' : 'created');
  } catch (error) {
    formError = error;
    $('#form-error').textContent = translatedError(error.message);
    $('#form-error').hidden = false;
  } finally {
    busy = false;
    $('#save-button').disabled = false;
    $('#save-button').textContent = t('save');
  }
});
$('#application-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
for (const selector of ['#close-dialog', '#cancel-dialog']) $(selector).addEventListener('click', () => { if (!busy) $('#application-dialog').close(); });
for (const selector of ['#add-button', '#empty-add']) $(selector).addEventListener('click', () => openForm());
$('#search').addEventListener('input', render);
$('#status-filter').addEventListener('change', render);
$('#action-filter').addEventListener('change', render);
$('#retry-button').addEventListener('click', load);
$('#task-filter').addEventListener('change', renderTasks);

async function load() {
  loadError = null;
  $('#load-error').hidden = true;
  $('#retry-button').hidden = true;
  $('#retry-button').disabled = true;
  try {
    applications = await api();
    loaded = true;
    render();
  } catch (error) {
    loadError = error;
    $('#result-count').textContent = t('loadFailed');
    $('#load-error').textContent = t('loadError', {error: translatedError(error.message)});
    $('#load-error').hidden = false;
    $('#retry-button').hidden = false;
  } finally { $('#retry-button').disabled = false; }
}
for (const selector of ['#language-select', '#form-language-select']) {
  $(selector).addEventListener('change', event => {
    language = event.target.value === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem('tracker-language', language); } catch { /* Keep working without storage. */ }
    updateLanguage();
  });
}
updateLanguage();
load();


function renderTasks() {
  const filter = $('#task-filter').value;
  const tasks = dueTasks(applications, filter);
  $('#task-list').replaceChildren();
  $('#task-empty').hidden = tasks.length > 0;
  $('#task-empty').textContent = t(filter === 'completed' ? 'noCompletedTasks' : 'noDueTasks');
  for (const application of tasks) {
    const row = element('article', undefined, 'task-row');
    const state = taskState(application);
    const info = element('div', undefined, 'task-info');
    info.append(element('strong', application.next_step), element('small', `${application.company} · ${application.role}`));
    const date = element('div', undefined, 'task-date');
    date.append(element('span', t(state), `task-badge ${state}`));
    if (application.next_step_due_date) date.append(element('small', application.next_step_due_date));
    const toggle = element('button', t(application.next_step_done ? 'markIncomplete' : 'markComplete'), 'secondary task-toggle');
    toggle.setAttribute('aria-label', t(application.next_step_done ? 'reopenFor' : 'completeFor', {company: application.company}));
    toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      try {
        const payload = Object.fromEntries(fields.map(key => [key, application[key]]));
        payload.next_step_done = !application.next_step_done;
        const updated = await api(`/${application.id}`, {method: 'PUT', body: JSON.stringify(payload)});
        applications = applications.map(a => a.id === updated.id ? updated : a);
        render();
        toast('taskUpdated');
      } catch (error) { toast(null, error); toggle.disabled = false; }
    });
    const edit = element('button', t('edit'), 'text-button');
    edit.setAttribute('aria-label', t('editFor', {company: application.company}));
    edit.addEventListener('click', () => openForm(application));
    const actions = element('div', undefined, 'task-actions');
    actions.append(edit, toggle);
    row.append(info, date, actions);
    $('#task-list').append(row);
  }
}
// Refresh calendar classifications at local midnight, including after laptop sleep.
let calendarDay = localDateString();
function refreshDay() {
  const today = localDateString();
  if (today !== calendarDay && loaded) { calendarDay = today; render(); }
}
setInterval(refreshDay, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
