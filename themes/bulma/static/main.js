document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.navbar-burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const target = document.getElementById(burger.dataset.target);
      burger.classList.toggle('is-active');
      target?.classList.toggle('is-active');
      burger.setAttribute('aria-expanded', burger.classList.contains('is-active') ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.protected-page').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = form.querySelector('input[type="password"]');
      const message = form.querySelector('.protected-message');
      const content = form.querySelector('.protected-content');
      if (!password?.value) return;
      message.textContent = '正在验证…';
      try {
        const endpoint = '/api/page/render/' + encodeURIComponent(form.dataset.pageId);
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password.value }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.status) throw new Error(payload.message || '密码错误');
        content.innerHTML = payload.content;
        password.value = '';
        form.querySelector('.field').remove();
        message.textContent = '';
        window.hljs?.highlightAll();
      } catch (error) {
        message.textContent = error.message;
        password.value = '';
        password.focus();
      }
    });
  });

  document.querySelectorAll('[data-copy-code]').forEach((button) => {
    button.addEventListener('click', async () => {
      const code = document.getElementById('code-display')?.textContent || '';
      await navigator.clipboard.writeText(code);
      button.textContent = '已复制';
    });
  });

  window.hljs?.highlightAll();
});
