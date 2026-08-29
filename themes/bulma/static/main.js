function generateTOC() {
  const article = document.getElementById('article');
  const container = document.getElementById('toc-container');
  const toc = document.getElementById('toc');
  if (!article || !container || !toc) return;

  toc.replaceChildren();
  const headings = article.querySelectorAll('.article-content h2, .article-content h3, .protected-content h2, .protected-content h3');
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `section-${index + 1}`;
    const item = document.createElement('li');
    item.className = heading.tagName === 'H3' ? 'toc-level-3' : 'toc-level-2';
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent || `第 ${index + 1} 节`;
    item.append(link);
    toc.append(item);
  });
  container.hidden = headings.length === 0;
}

function enhanceArticle() {
  document.querySelectorAll('.article-content img, .protected-content img').forEach((image) => {
    image.loading = 'lazy';
    image.decoding = 'async';
  });

  document.querySelectorAll('.article-content table, .protected-content table').forEach((table, index) => {
    table.tabIndex = 0;
    table.setAttribute('role', 'region');
    table.setAttribute('aria-label', `正文表格 ${index + 1}，可横向滚动`);
  });

  document.querySelectorAll('.article-content pre, .protected-content pre').forEach((block) => {
    if (block.querySelector('[data-copy-block]')) return;
    const code = block.querySelector('code');
    if (!code) return;
    block.classList.add('code-block');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-button';
    button.dataset.copyBlock = '';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制这段代码');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent || '');
        button.textContent = '已复制';
        window.setTimeout(() => { button.textContent = '复制'; }, 1600);
      } catch {
        button.textContent = '复制失败';
      }
    });
    block.append(button);
  });
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

  document.querySelectorAll('.nav-group-label').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('.nav-group');
      const expanded = group?.classList.toggle('is-open') || false;
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  });

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
        if (payload.raw) {
          const frame = document.createElement('iframe');
          frame.className = 'raw-frame';
          frame.title = '受保护的 HTML 页面';
          frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals allow-downloads');
          frame.srcdoc = payload.content;
          content.replaceChildren(frame);
        } else {
          content.innerHTML = payload.content;
        }
        password.value = '';
        form.querySelector('.protected-controls')?.remove();
        form.querySelector('label')?.remove();
        form.querySelector('.protected-lock')?.remove();
        form.querySelector('h2')?.remove();
        message.textContent = '';
        enhanceArticle();
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

  enhanceArticle();
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
