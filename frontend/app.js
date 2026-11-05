const statuses = {saved: '待申请', applied: '已申请', assessment: '笔试', interview: '面试', offer: 'Offer', rejected: '拒绝', withdrawn: '已撤回'};
const fields = ['company', 'role', 'url', 'status', 'applied_date', 'deadline', 'next_step', 'notes'];
const $ = (selector) => document.querySelector(selector);
let applications = [];
let editingId = null;
let toastTimer;
let busy = false;

for (const [value, label] of Object.entries(statuses)) {
  $('#status-filter').add(new Option(label, value));
  $('#form-status').add(new Option(label, value));
}

async function api(path = '', options = {}) {
  const response = await fetch(`/api/applications${path}`, {
    ...options,
    headers: {'Content-Type': 'application/json', ...options.headers},
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '操作失败，请重试。');
  return body;
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
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
  $('#total-count').textContent = applications.length;
  $('#active-count').textContent = applications.filter(a => ['applied', 'assessment', 'interview'].includes(a.status)).length;
  $('#interview-count').textContent = applications.filter(a => a.status === 'interview').length;
  $('#offer-count').textContent = applications.filter(a => a.status === 'offer').length;
  const query = $('#search').value.trim().toLocaleLowerCase();
  const status = $('#status-filter').value;
  const rows = applications.filter(a => (!status || a.status === status)
    && (!$('#action-filter').checked || a.next_step)
    && [a.company, a.role, a.notes].some(s => s.toLocaleLowerCase().includes(query)));
  $('#result-count').textContent = `显示 ${rows.length} 条，共 ${applications.length} 条机会`;
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
    select.setAttribute('aria-label', `${application.company} 的申请状态`);
    for (const [value, label] of Object.entries(statuses)) select.add(new Option(label, value));
    select.value = application.status;
    select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        const payload = Object.fromEntries(fields.map(key => [key, application[key]]));
        payload.status = select.value;
        const updated = await api(`/${application.id}`, {method: 'PUT', body: JSON.stringify(payload)});
        applications = applications.map(a => a.id === updated.id ? updated : a);
        render();
        toast('申请状态已更新');
      } catch (error) {
        select.value = application.status;
        toast(error.message);
      } finally { select.disabled = false; }
    });
    progress.append(select);
    const step = document.createElement('td');
    step.append(element('span', application.next_step || '暂未设置', application.next_step ? 'next-step' : 'muted'));
    if (application.deadline) step.append(element('small', `申请截止 ${application.deadline}`, 'deadline'));
    const actions = document.createElement('td');
    const edit = element('button', '编辑', 'text-button');
    edit.setAttribute('aria-label', `编辑 ${application.company} 的申请`);
    edit.addEventListener('click', () => openForm(application));
    const remove = element('button', '删除', 'text-button delete-button');
    remove.setAttribute('aria-label', `删除 ${application.company} 的申请`);
    remove.addEventListener('click', async () => {
      if (!window.confirm(`确定删除 ${application.company} 的「${application.role}」申请吗？此操作无法撤销。`)) return;
      remove.disabled = true;
      try {
        await api(`/${application.id}`, {method: 'DELETE'});
        applications = applications.filter(a => a.id !== application.id);
        render();
        toast('申请已删除');
      } catch (error) { toast(error.message); remove.disabled = false; }
    });
    actions.append(edit, remove);
    tr.append(job, progress, element('td', application.applied_date || '—', 'date-cell'), step, actions);
    $('#application-list').append(tr);
  }
  $('.table-wrap').hidden = rows.length === 0;
  $('#empty-state').hidden = rows.length !== 0;
  $('#empty-title').textContent = applications.length ? '没有匹配的申请' : '从第一个机会开始';
  $('#empty-description').textContent = applications.length ? '试试其他关键词，或调整筛选条件。' : '收藏一个心仪的岗位，或者记录已经投出的申请。';
  $('#empty-add').hidden = applications.length > 0;
}

function openForm(application = null) {
  editingId = application?.id ?? null;
  $('#application-form').reset();
  $('#form-error').hidden = true;
  $('#dialog-title').textContent = editingId ? '编辑申请' : '新增申请';
  if (application) for (const key of fields) $('#application-form').elements[key].value = application[key];
  $('#application-dialog').showModal();
}

$('#application-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const payload = Object.fromEntries(new FormData(event.target));
  busy = true;
  $('#save-button').disabled = true;
  $('#save-button').textContent = '正在保存…';
  $('#form-error').hidden = true;
  try {
    const updated = await api(editingId ? `/${editingId}` : '', {method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload)});
    applications = editingId ? applications.map(a => a.id === updated.id ? updated : a) : [updated, ...applications];
    $('#application-dialog').close();
    render();
    toast(editingId ? '申请已更新' : '新的机会已记录');
  } catch (error) {
    $('#form-error').textContent = error.message;
    $('#form-error').hidden = false;
  } finally {
    busy = false;
    $('#save-button').disabled = false;
    $('#save-button').textContent = '保存申请';
  }
});
$('#application-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
for (const selector of ['#close-dialog', '#cancel-dialog']) $(selector).addEventListener('click', () => { if (!busy) $('#application-dialog').close(); });
for (const selector of ['#add-button', '#empty-add']) $(selector).addEventListener('click', () => openForm());
$('#search').addEventListener('input', render);
$('#status-filter').addEventListener('change', render);
$('#action-filter').addEventListener('change', render);
$('#retry-button').addEventListener('click', load);

async function load() {
  $('#load-error').hidden = true;
  $('#retry-button').hidden = true;
  $('#retry-button').disabled = true;
  try {
    applications = await api();
    render();
  } catch (error) {
    $('#result-count').textContent = '加载失败';
    $('#load-error').textContent = `无法加载申请：${error.message} 请确认本地服务正在运行。`;
    $('#load-error').hidden = false;
    $('#retry-button').hidden = false;
  } finally { $('#retry-button').disabled = false; }
}
load();
