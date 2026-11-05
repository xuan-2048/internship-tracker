// Hosted account controls; application records remain server-side.
window.addEventListener('DOMContentLoaded', async () => {
  messages.local = ['Personal workspace', '个人工作区'];
  messages.stored = ['Saved online · v0.3', '在线保存 · v0.3'];
  messages.signOut = ['Sign out', '退出登录'];
  messages.signingOut = ['Signing out…', '正在退出…'];
  updateLanguage();
  try {
    const session = await fetch('/api/auth/session', {cache:'no-store'});
    if (!session.ok) { window.location.replace('/login'); return; }
    const button = document.createElement('button');
    button.className = 'secondary';
    button.dataset.i18n = 'signOut';
    button.textContent = t('signOut');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = t('signingOut');
      try {
        const result = await fetch('/api/auth/logout', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'});
        if (!result.ok) throw new Error();
        window.location.replace('/login');
      } catch { button.disabled=false; button.textContent=t('signOut'); toast('genericError'); }
    });
    document.querySelector('header .header-actions').append(button);
  } catch { window.location.replace('/login'); }
});
