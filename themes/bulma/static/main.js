function generateTOC() {
  const article = document.getElementById('article');
  const container = document.getElementById('toc-container');
  const toc = document.getElementById('toc');
  if (!article || !container || !toc) return;

  toc.replaceChildren();
  const headings = article.querySelectorAll('.article-content h2, .protected-content h2');
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `section-${index + 1}`;
    const item = document.createElement('li');
    item.className = 'toc-level-2';
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent || `第 ${index + 1} 节`;
    item.append(link);
    toc.append(item);
  });
  container.hidden = headings.length === 0;
}

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
        generateTOC();
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

  document.querySelectorAll('[data-focus-code]').forEach((button) => {
    button.addEventListener('click', () => {
      const code = document.getElementById('code-display');
      const focused = document.body.classList.toggle('code-focus-mode');
      if (focused && code) {
        document.body.style.backgroundColor = getComputedStyle(code).backgroundColor;
      } else {
        document.body.style.removeProperty('background-color');
      }
      button.textContent = focused ? 'Exit Focus' : 'Focus';
    });
  });

  generateTOC();
  window.hljs?.highlightAll();
});

window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'blog-raw-height') return;
  document.querySelectorAll('.raw-frame').forEach((frame) => {
    if (frame.contentWindow !== event.source) return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 0) {
      frame.style.height = `${Math.min(Math.max(height, 320), 20000)}px`;
    }
  });
});
