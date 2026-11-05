// Hosted labels override the local storage description; records are stored in D1.
window.addEventListener('DOMContentLoaded', () => {
  messages.local = ['Private workspace', '个人私密工作区'];
  messages.stored = ['Saved securely online · v0.2', '在线保存 · v0.2'];
  updateLanguage();
});
