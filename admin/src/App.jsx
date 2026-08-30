import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { homePageMode, parseNavigationConfig, serializeNavigationConfig, validateNavigationGroups, valueForHomePageMode } from './settings.js';

const ArticleWorkspace = lazy(() => import('./ArticleWorkspace.jsx'));

const PAGE_TYPES = ['文章', '代码', '公告', '讨论', '友链', 'HTML', '媒体', '时间线', '重定向', '文本'];
const PAGE_STATES = ['已撤回', '已发布', '已置顶', '已隐藏'];
const EMPTY_PAGE = { type: 0, link: '', pageStatus: 1, commentStatus: 1, title: '', content: '', tag: 'Others', password: '', description: '' };
const THEME_STORAGE_KEY = 'blog-theme';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const dark = theme === 'dark';
  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#111712' : '#f4f5f1');
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* private mode */ }
    setTheme(next);
  }
  return <button className="admin-theme-toggle" type="button" onClick={toggle} aria-label={dark ? '切换到日间主题' : '切换到夜间主题'} aria-pressed={dark} title={dark ? '切换到日间主题' : '切换到夜间主题'}><span aria-hidden="true">{dark ? '☀' : '☾'}</span></button>;
}

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '') || 'posts';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const change = () => setRoute(read());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return route;
}

function go(route) { window.location.hash = `#/${route}`; }

function PageHeader({ kicker, title, description, actions }) {
  return <header className="page-heading"><div><p className="page-kicker">{kicker}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

function Notice({ notice, clear }) {
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(clear, 4200);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);
  if (!notice) return null;
  return <div className={`toast ${notice.error ? 'is-error' : 'is-success'}`} role="status"><span className="toast-dot" />{notice.text}<button type="button" onClick={clear} aria-label="关闭通知">×</button></div>;
}

function Login({ route }) {
  const returnTo = route.startsWith('cli') ? `/admin/#/${route}` : '/admin/';
  return <main className="login-shell"><section className="login-card"><div className="login-art" aria-hidden="true"><span className="login-orbit orbit-one" /><span className="login-orbit orbit-two" /><span className="login-letter">B</span><p>WRITE · PUBLISH · OWN</p></div><div className="login-panel"><div className="login-topbar"><a className="login-brand" href="/"><span>B</span> Blog Studio</a><ThemeToggle /></div><div className="login-copy"><p className="page-kicker">WELCOME BACK</p><h1>回到你的写作空间</h1><p>内容、文件和站点设置都在这里。只有配置的 GitHub 账户可以访问。</p></div><a className="button primary wide" href={`/auth/github?return_to=${encodeURIComponent(returnTo)}`}>使用 GitHub 安全登录 <span>→</span></a><a className="back-link" href="/">← 返回博客首页</a></div></section></main>;
}

function Layout({ user, route, children }) {
  const items = [
    ['posts', '文', '内容'],
    ['analytics', '↗', '数据统计'],
    ['editor', '＋', '新建'],
    ['microblog', '◌', '微博客'],
    ['files', '↑', '媒体库'],
    ['settings', '◎', '站点设置'],
    ['cli', '>_', 'CLI'],
  ];
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand-row"><a className="admin-brand" href="/"><span className="admin-brand-mark">B</span><span><strong>Blog Studio</strong><small>独立写作后台</small></span></a><ThemeToggle /></div>
      <nav className="admin-nav" aria-label="管理导航">{items.map(([key, icon, label]) => <a key={key} className={route.startsWith(key) ? 'is-active' : ''} href={`#/${key}`}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>{route.startsWith(key) && <i />}</a>)}</nav>
      <a className="view-site-link" href="/" target="_blank" rel="noreferrer"><span>↗</span> 在新窗口查看博客</a>
      <div className="admin-account">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : <span className="account-fallback">{(user.name || user.login || 'A')[0]}</span>}<div><strong>{user.name || user.login}</strong><small><span /> 已登录</small></div><a href="/auth/logout" aria-label="退出登录">退出</a></div>
    </aside>
    <main className="admin-content">{children}</main>
  </div>;
}

function CLI({ route, notify }) {
  const [info, setInfo] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [code, setCode] = useState(() => new URLSearchParams(route.split('?')[1] || '').get('code') || '');
  const [device, setDevice] = useState(null);
  const [busy, setBusy] = useState(false);
  const normalized = code.trim().toUpperCase();
  const loadTokens = useCallback(() => api('/api/cli/tokens').then((payload) => setTokens(payload.tokens || [])).catch((error) => notify(error.message, true)), [notify]);
  useEffect(() => { const routeCode = new URLSearchParams(route.split('?')[1] || '').get('code'); if (routeCode) setCode(routeCode); }, [route]);
  useEffect(() => { api('/api/cli/info').then(setInfo).catch((error) => notify(error.message, true)); loadTokens(); }, [loadTokens, notify]);
  useEffect(() => {
    if (!/^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/.test(normalized)) { setDevice(null); return; }
    const formatted = normalized.includes('-') ? normalized : `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
    api(`/api/cli/device/${encodeURIComponent(formatted)}`).then((payload) => setDevice(payload.device)).catch(() => setDevice(null));
  }, [normalized]);
  async function decide(approve) {
    setBusy(true);
    try { const payload = await api(`/api/cli/device/${approve ? 'approve' : 'deny'}`, { method: 'POST', body: { userCode: normalized } }); notify(payload.message); setDevice((current) => current ? { ...current, state: approve ? 'approved' : 'denied' } : current); }
    catch (error) { notify(error.message, true); } finally { setBusy(false); }
  }
  async function revoke(id) {
    if (!window.confirm('确认撤销这个 CLI token？使用它的终端会立即失去访问权限。')) return;
    try { await api(`/api/cli/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadTokens(); notify('CLI token 已撤销'); } catch (error) { notify(error.message, true); }
  }
  async function copy(value) { try { await navigator.clipboard.writeText(value); notify('安装命令已复制'); } catch { notify('无法自动复制，请手动选择命令', true); } }
  return <section><PageHeader kicker="DEVELOPER TOOLS" title="命令行工具" description="在终端里完成发布、文件与站点管理。" />
    <div className="content-grid two-column">
      <section className="panel"><div className="panel-heading"><span className="panel-icon">⌘</span><div><h2>安装 CLI</h2><p>独立 Go 二进制，无需 Python 或 Go</p></div></div>{info && <div className="cli-command"><code>{info.installCommand}</code><button className="button subtle small" type="button" onClick={() => copy(info.installCommand)}>复制</button></div>}<p className="help-text">安装后运行 <code>blog-cli auth login</code>。自动化场景可使用 <code>--json</code>。</p></section>
      <section className="panel"><div className="panel-heading"><span className="panel-icon">✓</span><div><h2>批准设备登录</h2><p>逐字核对终端上的授权码</p></div></div><input className="input cli-code-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="ABCD-EFGH" maxLength="9" aria-label="终端授权码" />{device ? <div className="device-request"><p><strong>{device.clientName}</strong> 请求管理博客</p><small>{device.userCode} · {device.state} · {new Date(device.expiresAt).toLocaleString()}</small>{device.state === 'pending' && <div className="button-row"><button className="button primary" type="button" disabled={busy} onClick={() => decide(true)}>批准</button><button className="button subtle" type="button" disabled={busy} onClick={() => decide(false)}>拒绝</button></div>}</div> : normalized && <p className="help-text">输入完整授权码后将在这里显示设备信息。</p>}</section>
    </div>
    <section className="panel table-panel"><div className="panel-heading with-action"><div><h2>已授权的终端</h2><p>{tokens.length} 个有效凭据</p></div><button className="button subtle small" type="button" onClick={loadTokens}>刷新</button></div>{tokens.length === 0 ? <EmptyState title="还没有终端登录" text="运行 CLI 登录命令后，授权记录会显示在这里。" /> : <div className="table-scroll"><table><thead><tr><th>客户端</th><th>账户</th><th>最近使用</th><th>到期</th><th /></tr></thead><tbody>{tokens.map((token) => <tr key={token.id}><td><strong>{token.clientName}</strong><small>{token.id}</small></td><td>{token.githubLogin}</td><td>{token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : '从未'}</td><td>{new Date(token.expiresAt).toLocaleDateString()}</td><td><button className="button danger small" type="button" onClick={() => revoke(token.id)}>撤销</button></td></tr>)}</tbody></table></div>}</section>
    <aside className="info-callout"><strong>给 Agent 的提示</strong><p>运行 <code>blog-cli help --json</code> 可获得机器可读的完整命令目录。删除和关机等操作仍需显式传入 <code>--yes</code>。</p></aside>
  </section>;
}

function EmptyState({ title, text }) { return <div className="admin-empty"><span aria-hidden="true">✦</span><h3>{title}</h3><p>{text}</p></div>; }

function Posts({ notify }) {
  const [pages, setPages] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [state, setState] = useState('all');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setLoading(true); setPages((await api('/api/page')).pages || []); } catch (error) { notify(error.message, true); } finally { setLoading(false); } }, [notify]);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => pages.filter((page) => (state === 'all' || Number(page.pageStatus) === Number(state)) && [page.title, page.link, page.tag, page.description].join(' ').toLowerCase().includes(keyword.toLowerCase())), [pages, keyword, state]);
  const metrics = useMemo(() => ({ total: pages.length, live: pages.filter((page) => [1, 2].includes(Number(page.pageStatus))).length, hidden: pages.filter((page) => Number(page.pageStatus) === 3).length, views: pages.reduce((sum, page) => sum + Number(page.view || 0), 0) }), [pages]);
  async function remove(id) { if (!window.confirm('确认删除这个页面？此操作不可撤销。')) return; try { await api(`/api/page/${id}`, { method: 'DELETE' }); setPages((items) => items.filter((item) => item.id !== id)); notify('页面已删除'); } catch (error) { notify(error.message, true); } }
  return <section><PageHeader kicker="CONTENT LIBRARY" title="内容" description="管理文章、独立页面和所有发布状态。" actions={<button className="button primary" type="button" onClick={() => go('editor')}>＋ 新建页面</button>} />
    <div className="metric-grid"><Metric label="全部内容" value={metrics.total} detail="所有页面" /><Metric label="公开发布" value={metrics.live} detail="含置顶内容" tone="green" /><Metric label="隐藏页面" value={metrics.hidden} detail="不进入索引" /><Metric label="累计阅读" value={metrics.views.toLocaleString()} detail="全部内容" /></div>
    <section className="panel table-panel"><div className="content-toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、链接、标签或描述" /></label><select className="select" value={state} onChange={(event) => setState(event.target.value)} aria-label="按状态筛选"><option value="all">全部状态</option>{PAGE_STATES.map((label, index) => <option value={index} key={label}>{label}</option>)}</select><span className="result-count">{filtered.length} 条结果</span></div>
      {loading ? <div className="loading-bar"><i /></div> : filtered.length === 0 ? <EmptyState title="没有匹配的内容" text="调整搜索条件，或创建一个新页面。" /> : <div className="table-scroll"><table className="content-table"><thead><tr><th>内容</th><th>类型</th><th>状态</th><th>标签</th><th>阅读</th><th><span className="sr-only">操作</span></th></tr></thead><tbody>{filtered.map((page) => <tr key={page.id}><td className="title-cell"><strong>{page.title || '无标题'}</strong><a href={`/page/${encodeURIComponent(page.link)}`} target="_blank" rel="noreferrer">/{page.link} ↗</a></td><td>{PAGE_TYPES[page.type] || page.type}</td><td><span className={`status-badge state-${page.pageStatus}`}><i />{PAGE_STATES[page.pageStatus]}</span></td><td><span className="muted-cell">{page.tag || '—'}</span></td><td>{Number(page.view || 0).toLocaleString()}</td><td><div className="row-actions"><button className="button subtle small" type="button" onClick={() => go(`editor/${page.id}`)}>编辑</button><a className="icon-button" href={`/api/page/export/${page.id}`} title="导出">↓</a><button className="icon-button danger-text" type="button" onClick={() => remove(page.id)} title="删除">×</button></div></td></tr>)}</tbody></table></div>}
    </section>
  </section>;
}

function Metric({ label, value, detail, tone = '' }) { return <article className={`metric-card ${tone}`}><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>; }

function Editor({ id, notify }) {
  const [page, setPage] = useState(EMPTY_PAGE);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!id) { setPage({ ...EMPTY_PAGE }); return; } api(`/api/page/${id}`).then((payload) => setPage(payload.page)).catch((error) => notify(error.message, true)); }, [id, notify]);
  function field(name, transform = (value) => value) { return (event) => setPage((current) => ({ ...current, [name]: transform(event.target.value) })); }
  const changeContent = useCallback((content) => setPage((current) => ({ ...current, content })), []);
  async function save(event) {
    event?.preventDefault();
    if (saving) return;
    if (!(page.title || '').trim()) { notify('请先填写页面标题', true); return; }
    if (!(page.link || '').trim()) { notify('请先设置固定链接', true); return; }
    if (!(page.content || '').trim()) { notify('正文还没有内容', true); return; }
    setSaving(true);
    try { const method = page.id ? 'PUT' : 'POST'; const payload = await api('/api/page', { method, body: { ...page, type: Number(page.type), pageStatus: Number(page.pageStatus), commentStatus: Number(page.commentStatus) } }); setPage((current) => ({ ...current, id: current.id || payload.id })); notify(page.id ? '页面已更新' : '页面已创建'); if (!page.id) go(`editor/${payload.id}`); }
    catch (error) { notify(error.message, true); } finally { setSaving(false); }
  }
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  });
  const tags = (page.tag || '').split(';').map((tag) => tag.trim()).filter(Boolean);
  const siteOrigin = window.location.origin;
  return <form className="editor-page" onSubmit={save}><PageHeader kicker={page.id ? 'EDIT CONTENT' : 'NEW CONTENT'} title={page.id ? '编辑页面' : '写一篇新内容'} description={page.id ? '修改内容、SEO 摘要与发布设置。' : '从标题开始，把想法变成一篇可以被找到的文章。'} actions={<><button className="button subtle" type="button" onClick={() => go('posts')}>返回列表</button>{page.link && <a className="button subtle" href={`/page/${encodeURIComponent(page.link)}`} target="_blank" rel="noreferrer">站点预览 ↗</a>}<button className="button primary" disabled={saving} title="保存页面（⌘/Ctrl + S）">{saving ? '保存中…' : '保存页面'}</button></>} />
    <div className="editor-grid"><section className="editor-main panel"><label className="field"><span className="field-label">标题</span><input className="title-input" value={page.title || ''} onChange={field('title')} placeholder="一篇值得读下去的标题" required maxLength="300" /><small>{(page.title || '').length} / 300</small></label><label className="field"><span className="field-label">摘要 <em>用于搜索结果和文章列表</em></span><textarea className="textarea description-input" rows="3" value={page.description || ''} onChange={field('description')} placeholder="用一两句话概括这篇内容，建议 80–160 个字。" maxLength="220" /><small>{(page.description || '').length} / 220</small></label><div className="field content-field"><span className="field-label">正文 <em>支持 Markdown、代码语法高亮与实时渲染；可拖放或粘贴图片</em></span><Suspense fallback={<div className="workspace-loading"><div className="loading-bar"><i /></div><span>正在准备写作环境…</span></div>}><ArticleWorkspace content={page.content || ''} onChange={changeContent} type={page.type} notify={notify} /></Suspense></div></section>
      <aside className="editor-sidebar"><section className="panel settings-panel"><div className="panel-heading"><div><h2>发布设置</h2><p>控制页面如何对外呈现</p></div></div><label className="field"><span className="field-label">固定链接</span><div className="slug-input"><span>/page/</span><input value={page.link || ''} onChange={field('link')} placeholder="my-post" required /></div></label><label className="field"><span className="field-label">内容类型</span><select className="select wide" value={page.type} onChange={field('type', Number)}>{PAGE_TYPES.map((label, index) => <option value={index} key={label}>{label}</option>)}</select></label><label className="field"><span className="field-label">发布状态</span><select className="select wide" value={page.pageStatus} onChange={field('pageStatus', Number)}>{PAGE_STATES.map((label, index) => <option value={index} key={label}>{label}{index === 3 ? '（noindex）' : ''}</option>)}</select></label><label className="field"><span className="field-label">标签 <em>用分号分隔</em></span><input className="input" value={page.tag || ''} onChange={field('tag')} /></label>{tags.length > 0 && <div className="tag-preview">{tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}<label className="field"><span className="field-label">阅读密码 <em>留空即公开</em></span><input className="input" type="password" value={page.password || ''} onChange={field('password')} autoComplete="new-password" /></label><label className="switch-row"><input type="checkbox" checked={Number(page.commentStatus) === 1} onChange={(event) => setPage((current) => ({ ...current, commentStatus: event.target.checked ? 1 : 0 }))} /><span className="switch" /><span><strong>允许评论</strong><small>读者可以参与讨论</small></span></label></section>
        <section className="panel seo-preview"><div className="panel-heading"><span className="panel-icon">S</span><div><h2>搜索结果预览</h2><p>发布前快速检查</p></div></div><div className="search-snippet"><small>{siteOrigin} › page › {page.link || 'your-link'}</small><h3>{page.title || '页面标题会显示在这里'}</h3><p>{page.description || '填写摘要，让搜索引擎和读者更快理解这篇内容。'}</p></div><ul><li className={page.title ? 'done' : ''}>{page.title ? '标题已填写' : '需要页面标题'}</li><li className={(page.description || '').length >= 60 ? 'done' : ''}>{(page.description || '').length >= 60 ? '摘要长度良好' : '建议摘要至少 60 字'}</li><li className={page.link ? 'done' : ''}>{page.link ? '链接已设置' : '需要固定链接'}</li></ul></section>
      </aside></div>
  </form>;
}

function Files({ notify }) {
  const [files, setFiles] = useState([]);
  const [upload, setUpload] = useState(null);
  const load = useCallback(() => api('/api/file').then((payload) => setFiles(payload.files || [])).catch((error) => notify(error.message, true)), [notify]);
  useEffect(() => { load(); }, [load]);
  async function submit(event) { event.preventDefault(); if (!upload) return; const body = new FormData(event.currentTarget); try { await api('/api/file', { method: 'POST', body }); event.currentTarget.reset(); setUpload(null); await load(); notify('文件已上传'); } catch (error) { notify(error.message, true); } }
  async function remove(id) { if (!window.confirm('确认删除这个文件？')) return; try { await api(`/api/file/${encodeURIComponent(id)}`, { method: 'DELETE' }); await load(); notify('文件已删除'); } catch (error) { notify(error.message, true); } }
  return <section><PageHeader kicker="MEDIA LIBRARY" title="媒体库" description="上传并管理文章所需的图片和附件。" />
    <form className="upload-panel" onSubmit={submit}><label className="upload-drop"><input type="file" name="file" onChange={(event) => setUpload(event.target.files[0])} required /><span className="upload-icon">↑</span><strong>{upload ? upload.name : '选择一个文件上传'}</strong><small>{upload ? `${(upload.size / 1024).toFixed(1)} KB` : '点击选择文件，单个文件不超过站点限制'}</small></label><div className="upload-meta"><input className="input" name="description" placeholder="添加一段便于检索的描述（可选）" /><button className="button primary" disabled={!upload}>上传文件</button></div></form>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>全部文件</h2><p>{files.length} 个文件</p></div></div>{files.length === 0 ? <EmptyState title="媒体库还是空的" text="上传第一张图片或附件，它会显示在这里。" /> : <div className="table-scroll"><table><thead><tr><th>文件名</th><th>描述</th><th>地址</th><th /></tr></thead><tbody>{files.map((file) => <tr key={file.id}><td><strong>{file.filename}</strong></td><td className="muted-cell">{file.description || '—'}</td><td><a className="file-path" href={file.path} target="_blank" rel="noreferrer">{file.path} ↗</a></td><td><button className="button danger small" type="button" onClick={() => remove(file.id)}>删除</button></td></tr>)}</tbody></table></div>}</section>
  </section>;
}

const EMPTY_MICRO_POST = { content: '', status: 1 };

function Microblog({ notify }) {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(EMPTY_MICRO_POST);
  const [saving, setSaving] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const composerRef = useRef(null);
  const changeDraftContent = useCallback((content) => setDraft((current) => ({ ...current, content })), []);
  const submitDraftShortcut = useCallback(() => composerRef.current?.requestSubmit(), []);
  const load = useCallback(async (offset = 0) => {
    try {
      const payload = await api(`/api/microblog?offset=${offset}`);
      setPosts((current) => offset ? [...current, ...(payload.posts || [])] : (payload.posts || []));
      setTotal(Number(payload.total || 0));
      setConfig(payload.config);
    } catch (error) { notify(error.message, true); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);
  async function savePost(event) {
    event.preventDefault();
    if (saving) return;
    if (!draft.content.trim()) { notify('先写点内容再发布', true); return; }
    setSaving(true);
    try {
      if (draft.id) await api(`/api/microblog/${draft.id}`, { method: 'PUT', body: draft });
      else await api('/api/microblog', { method: 'POST', body: draft });
      notify(draft.id ? '微博已更新' : '微博已发布'); setDraft({ ...EMPTY_MICRO_POST }); await load();
    } catch (error) { notify(error.message, true); }
    finally { setSaving(false); }
  }
  async function remove(id) {
    if (!window.confirm('确认删除这条微博？此操作不可撤销。')) return;
    try { await api(`/api/microblog/${id}`, { method: 'DELETE' }); setPosts((items) => items.filter((item) => item.id !== id)); setTotal((value) => Math.max(0, value - 1)); if (draft.id === id) setDraft({ ...EMPTY_MICRO_POST }); notify('微博已删除'); }
    catch (error) { notify(error.message, true); }
  }
  async function saveConfig(event) {
    event.preventDefault(); setConfigSaving(true);
    try { const payload = await api('/api/microblog/config', { method: 'PUT', body: config }); setConfig(payload.config); notify(payload.config.enabled ? '微博客设置已保存并启用' : '微博客已停用，后台数据仍然保留'); }
    catch (error) { notify(error.message, true); }
    finally { setConfigSaving(false); }
  }
  if (loading || !config) return <div className="loading-page"><div className="loading-bar"><i /></div></div>;
  const publicCount = posts.filter((post) => Number(post.status) === 1).length;
  const publicPath = `/${config.path}`;
  return <section><PageHeader kicker="SHORT NOTES" title="微博客" description="发布短内容，并独立控制公开入口与可见性。" actions={<a className="button subtle" href={publicPath} target="_blank" rel="noreferrer">查看公开页 ↗</a>} />
    <div className="metric-grid microblog-metrics"><Metric label="全部微博" value={total} detail="公开与私密" /><Metric label="当前已加载" value={posts.length} detail={`${publicCount} 条公开`} tone="green" /><Metric label="公开入口" value={config.enabled ? '运行中' : '已停用'} detail={publicPath} tone={config.enabled ? 'green' : ''} /></div>
    <div className="microblog-admin-grid">
      <div className="microblog-admin-main">
        <form ref={composerRef} className="panel micro-composer" onSubmit={savePost}><div className="panel-heading with-action"><div><h2>{draft.id ? `编辑微博 #${draft.id}` : '写一条微博'}</h2><p>支持 Markdown、实时预览与图片粘贴，最多 64 KiB</p></div>{draft.id && <button className="button subtle small" type="button" onClick={() => setDraft({ ...EMPTY_MICRO_POST })}>取消编辑</button>}</div><Suspense fallback={<div className="micro-workspace-loading"><div className="loading-bar"><i /></div></div>}><ArticleWorkspace compact content={draft.content} onChange={changeDraftContent} type={0} notify={notify} onSubmitShortcut={submitDraftShortcut} /></Suspense><div className="composer-footer"><label className="field inline-field"><span className="field-label">可见性</span><select className="select" value={draft.status} onChange={(event) => setDraft({ ...draft, status: Number(event.target.value) })}><option value={1}>公开</option><option value={0}>私密</option></select></label><span className="composer-shortcut-hint">⌘/Ctrl + Enter {draft.id ? '保存' : '发布'}</span><span className="character-count">{draft.content.length.toLocaleString()} 字符</span><button className="button primary" disabled={saving}>{saving ? '保存中…' : draft.id ? '保存修改' : '发布微博'}</button></div></form>
        <section className="micro-post-admin-list" aria-label="微博列表">{posts.length === 0 ? <div className="panel"><EmptyState title="还没有微博" text="从上面的编辑器发布第一条短内容。" /></div> : posts.map((post) => <article className="panel micro-admin-card" key={post.id}><div className="micro-admin-meta"><span className={`status-badge state-${post.status ? 1 : 0}`}><i />{post.status ? '公开' : '私密'}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time><span>#{post.id}</span></div><div className="micro-admin-content">{post.content}</div><div className="row-actions"><button className="button subtle small" type="button" onClick={() => { setDraft({ ...post }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>编辑</button><button className="button danger small" type="button" onClick={() => remove(post.id)}>删除</button></div></article>)}</section>
        {posts.length < total && <button className="button subtle wide load-more" type="button" onClick={() => load(posts.length)}>加载更多</button>}
      </div>
      <aside><form className="panel settings-panel microblog-config" onSubmit={saveConfig}><div className="panel-heading"><div><h2>功能设置</h2><p>修改后立即生效，无需重启</p></div></div><label className="switch-row"><input type="checkbox" checked={config.enabled} onChange={(event) => setConfig({ ...config, enabled: event.target.checked })} /><span className="switch" /><span><strong>启用公开微博客</strong><small>停用后公开路径返回 404，后台和数据保留</small></span></label><label className="field"><span className="field-label">独立访问路径</span><div className="slug-input"><span>/</span><input value={config.path} onChange={(event) => setConfig({ ...config, path: event.target.value })} placeholder="microblog" required /></div><small>支持多级路径，如 notes/daily；不能占用系统路径。</small></label><label className="field"><span className="field-label">页面标题</span><input className="input" value={config.title} onChange={(event) => setConfig({ ...config, title: event.target.value })} required maxLength="80" /></label><label className="field"><span className="field-label">页面简介</span><textarea className="textarea" rows="4" value={config.description} onChange={(event) => setConfig({ ...config, description: event.target.value })} maxLength="240" /></label><button className="button primary wide" disabled={configSaving}>{configSaving ? '保存中…' : '保存功能设置'}</button></form></aside>
    </div>
  </section>;
}

function AnalyticsTrend({ daily }) {
  const width = 760;
  const height = 230;
  const inset = 22;
  const max = Math.max(1, ...daily.map((item) => Number(item.pv || 0)));
  const point = (item, index, key) => {
    const x = daily.length === 1 ? width / 2 : inset + (index * (width - inset * 2)) / (daily.length - 1);
    const y = height - inset - (Number(item[key] || 0) / max) * (height - inset * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const pvPoints = daily.map((item, index) => point(item, index, 'pv')).join(' ');
  const uvPoints = daily.map((item, index) => point(item, index, 'uv')).join(' ');
  const labels = daily.length ? [daily[0], daily[Math.floor((daily.length - 1) / 2)], daily[daily.length - 1]] : [];
  return <div className="trend-chart">
    <div className="chart-legend"><span className="pv-dot" />PV <span className="uv-dot" />UV</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="每日 PV 和 UV 趋势">
      {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1={inset} x2={width - inset} y1={inset + ratio * (height - inset * 2)} y2={inset + ratio * (height - inset * 2)} className="chart-grid-line" />)}
      {daily.length > 0 && <><polyline className="chart-line pv-line" points={pvPoints} /><polyline className="chart-line uv-line" points={uvPoints} /></>}
    </svg>
    <div className="chart-labels">{labels.map((item, index) => <span key={`${item.date}-${index}`}>{item.date.slice(5)}</span>)}</div>
  </div>;
}

function DimensionList({ items, empty }) {
  const max = Math.max(1, ...items.map((item) => Number(item.pv || 0)));
  if (!items.length) return <EmptyState title={empty} text="有访问后会自动显示在这里。" />;
  return <div className="dimension-list">{items.map((item) => <div className="dimension-row" key={item.value} title={item.value}><div><span>{item.value}</span><strong>{Number(item.pv || 0).toLocaleString()}</strong></div><i><b style={{ width: `${(Number(item.pv || 0) / max) * 100}%` }} /></i></div>)}</div>;
}

function Analytics({ notify }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await api(`/api/analytics?days=${days}`)).analytics); }
    catch (error) { notify(error.message, true); }
    finally { setLoading(false); }
  }, [days, notify]);
  useEffect(() => { load(); }, [load]);
  const actions = <div className="range-switch" aria-label="统计周期">{[7, 30, 90, 365].map((value) => <button className={days === value ? 'is-active' : ''} type="button" key={value} onClick={() => setDays(value)}>{value === 365 ? '一年' : `${value} 天`}</button>)}</div>;
  if (loading && !data) return <section><PageHeader kicker="AUDIENCE INSIGHTS" title="数据统计" description="了解文章阅读、访客与流量来源。" actions={actions} /><div className="loading-page"><div className="loading-bar"><i /></div></div></section>;
  const summary = data?.summary || {};
  const average = data?.days ? Number(summary.pv || 0) / data.days : 0;
  return <section className={loading ? 'analytics-page is-refreshing' : 'analytics-page'}><PageHeader kicker="AUDIENCE INSIGHTS" title="数据统计" description="了解文章阅读、访客与流量来源。" actions={actions} />
    <div className="metric-grid"><Metric label="浏览量 PV" value={Number(summary.pv || 0).toLocaleString()} detail={`过去 ${data?.days || days} 天`} tone="green" /><Metric label="访客数 UV" value={Number(summary.uv || 0).toLocaleString()} detail="周期内去重访客" /><Metric label="今日访问" value={`${Number(summary.todayPv || 0).toLocaleString()} / ${Number(summary.todayUv || 0).toLocaleString()}`} detail="PV / UV" /><Metric label="日均浏览" value={average.toLocaleString(undefined, { maximumFractionDigits: 1 })} detail={`${data?.startDate || ''} 起`} /></div>
    <section className="panel analytics-trend-panel"><div className="panel-heading with-action"><div><h2>阅读趋势</h2><p>每日浏览量与独立访客</p></div><button className="button subtle small" type="button" onClick={load}>刷新</button></div><AnalyticsTrend daily={data?.daily || []} /></section>
    <section className="panel table-panel analytics-pages"><div className="panel-heading"><div><h2>文章表现</h2><p>按所选周期内浏览量排序</p></div></div>{!data?.pages?.length ? <EmptyState title="还没有统计数据" text="新访问会从本次上线后开始记录。" /> : <div className="table-scroll"><table><thead><tr><th>文章</th><th>PV</th><th>UV</th><th>人均浏览</th></tr></thead><tbody>{data.pages.map((page) => <tr key={page.pageId}><td className="title-cell"><strong>{page.title || page.link || '已删除文章'}</strong>{page.link ? <a href={`/page/${encodeURIComponent(page.link)}`} target="_blank" rel="noreferrer">/{page.link} ↗</a> : <small>{page.pageId}</small>}</td><td>{Number(page.pv || 0).toLocaleString()}</td><td>{Number(page.uv || 0).toLocaleString()}</td><td>{page.uv ? (Number(page.pv) / Number(page.uv)).toFixed(1) : '—'}</td></tr>)}</tbody></table></div>}</section>
    <div className="analytics-dimensions"><section className="panel"><div className="panel-heading"><div><h2>Referrer 来源</h2><p>前 12 个来源域名</p></div></div><DimensionList items={data?.referrers || []} empty="暂无来源数据" /></section><section className="panel"><div className="panel-heading"><div><h2>搜索引擎</h2><p>从 Referrer 自动识别</p></div></div><DimensionList items={data?.searchEngines || []} empty="暂无搜索来源" /></section><section className="panel"><div className="panel-heading"><div><h2>搜索关键词</h2><p>仅展示搜索引擎仍提供的查询词</p></div></div><DimensionList items={data?.searchKeywords || []} empty="暂无可见关键词" /></section><section className="panel"><div className="panel-heading"><div><h2>User-Agent</h2><p>前 12 个访问客户端</p></div></div><DimensionList items={data?.agents || []} empty="暂无 UA 数据" /></section></div>
    <aside className="info-callout"><strong>隐私与关键词说明</strong><p>统计不保存原始 IP；UV 使用随机的一方访客标识做不可逆摘要。普通 Referrer 仅保留来源域名；识别为搜索引擎时会额外保存其明确提供的搜索词。多数 HTTPS 搜索引擎已隐藏查询词，因此搜索流量通常会多于可见关键词。</p></aside>
  </section>;
}

const SETTING_GROUPS = [
  { title: '品牌与基础信息', description: '决定站点在首页、浏览器和分享卡片中的身份。', fields: [
    ['site_name', '站点名称', 'text', '例如：山海之间'], ['motto', '首页主标题 / Slogan', 'text', '一句最能代表这个博客的话'], ['description', '站点描述', 'textarea', '用于首页介绍和搜索引擎摘要'], ['author', '作者名称', 'text', '显示在页脚与结构化数据中'],
  ] },
  { title: '域名与 SEO', description: '这些设置会影响 canonical、分享预览和搜索引擎识别。', fields: [
    ['domain', '公开域名', 'text', 'blog.example.com（不要包含路径）'], ['language', '内容语言', 'text', '例如 zh-CN'], ['favicon', 'Favicon 地址', 'text', '/favicon.ico'], ['brand_image', '品牌图片地址', 'text', '/upload/brand.webp'], ['social_image', '社交分享图地址', 'text', '/upload/og-cover.webp'],
  ] },
];

function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function NavigationEditor({ value, pages, onChange }) {
  const parsed = useMemo(() => parseNavigationConfig(value), [value]);
  const groups = parsed.groups;
  const setGroups = (next) => onChange(serializeNavigationConfig(next));
  const suggestions = useMemo(() => {
    const builtIn = [['/', '首页'], ['/archive', '存档'], ['/tags', '标签'], ['/feed.xml', '订阅']];
    return [...builtIn, ...pages.map((page) => [`/page/${page.link}`, page.title || page.link])];
  }, [pages]);
  function updateGroup(groupIndex, patch) { setGroups(groups.map((group, index) => index === groupIndex ? { ...group, ...patch } : group)); }
  function updateLink(groupIndex, itemIndex, patch) {
    updateGroup(groupIndex, { value: groups[groupIndex].value.map((item, index) => index === itemIndex ? { ...item, ...patch } : item) });
  }
  if (parsed.error) return <div className="nav-config-error" role="alert"><strong>现有导航配置无法读取</strong><p>{parsed.error}</p><textarea className="textarea code-input" rows="5" value={value || ''} onChange={(event) => onChange(event.target.value)} aria-label="原始导航 JSON" /><div className="button-row"><button className="button primary small" type="button" onClick={() => setGroups([{ key: '主导航', value: [{ text: '首页', link: '/' }, { text: '存档', link: '/archive' }] }])}>重建为默认导航</button></div><small>原始内容仍保留在上方，重建后请检查再保存。</small></div>;
  return <div className="nav-editor">
    <datalist id="navigation-link-suggestions">{suggestions.map(([link, label]) => <option value={link} key={link}>{label}</option>)}</datalist>
    <div className="nav-editor-help"><div><strong>可视化导航</strong><p>第一个分组会直接显示在主导航，其余分组显示为下拉菜单。</p></div><span>{groups.reduce((sum, group) => sum + group.value.length, 0)} 个链接</span></div>
    <div className="nav-group-list">{groups.map((group, groupIndex) => <section className="nav-group-card" key={`group-${groupIndex}`}>
      <header><span className="nav-drag-handle" aria-hidden="true">⠿</span><label><span className="sr-only">分组名称</span><input className="input" value={group.key} onChange={(event) => updateGroup(groupIndex, { key: event.target.value })} placeholder={groupIndex === 0 ? '主导航' : '下拉菜单名称'} /></label>{groupIndex === 0 && <span className="nav-primary-badge">主导航</span>}<div className="nav-order-actions"><button className="icon-button" type="button" disabled={groupIndex === 0} onClick={() => setGroups(moveItem(groups, groupIndex, groupIndex - 1))} aria-label="上移分组">↑</button><button className="icon-button" type="button" disabled={groupIndex === groups.length - 1} onClick={() => setGroups(moveItem(groups, groupIndex, groupIndex + 1))} aria-label="下移分组">↓</button><button className="icon-button danger-text" type="button" onClick={() => setGroups(groups.filter((_, index) => index !== groupIndex))} aria-label="删除分组">×</button></div></header>
      <div className="nav-link-list">{group.value.length === 0 && <p className="nav-empty-row">这个分组还没有链接。</p>}{group.value.map((item, itemIndex) => <div className="nav-link-row" key={`link-${itemIndex}`}><span className="nav-link-index">{itemIndex + 1}</span><label><span>显示名称</span><input className="input" value={item.text} onChange={(event) => updateLink(groupIndex, itemIndex, { text: event.target.value })} placeholder="例如：关于" /></label><label><span>链接地址</span><input className="input code-input" list="navigation-link-suggestions" value={item.link} onChange={(event) => updateLink(groupIndex, itemIndex, { link: event.target.value })} placeholder="/page/about 或 https://…" /></label><div className="nav-order-actions"><button className="icon-button" type="button" disabled={itemIndex === 0} onClick={() => updateGroup(groupIndex, { value: moveItem(group.value, itemIndex, itemIndex - 1) })} aria-label="上移链接">↑</button><button className="icon-button" type="button" disabled={itemIndex === group.value.length - 1} onClick={() => updateGroup(groupIndex, { value: moveItem(group.value, itemIndex, itemIndex + 1) })} aria-label="下移链接">↓</button><button className="icon-button danger-text" type="button" onClick={() => updateGroup(groupIndex, { value: group.value.filter((_, index) => index !== itemIndex) })} aria-label="删除链接">×</button></div></div>)}</div>
      <button className="button subtle small nav-add-link" type="button" onClick={() => updateGroup(groupIndex, { value: [...group.value, { text: '', link: '' }] })}>＋ 添加链接</button>
    </section>)}</div>
    <button className="button subtle nav-add-group" type="button" onClick={() => setGroups([...groups, { key: '', value: [] }])}>＋ 添加下拉分组</button>
    {groups.length === 0 && <button className="button primary nav-start-button" type="button" onClick={() => setGroups([{ key: '主导航', value: [{ text: '首页', link: '/' }] }])}>创建第一组导航</button>}
  </div>;
}

function HomePageEditor({ value, onChange }) {
  const mode = homePageMode(value);
  const choices = [
    ['list', '文章列表', '展示最新发布的文章，适合大多数博客。'],
    ['custom', '自定义首页', '使用 HTML 构建欢迎页或作品集入口。'],
    ['disabled', '关闭首页', '访问首页时返回 404。'],
  ];
  return <div className="home-page-editor"><div className="home-mode-grid" role="radiogroup" aria-label="首页展示方式">{choices.map(([key, title, description]) => <label className={mode === key ? 'is-selected' : ''} key={key}><input type="radio" name="home-page-mode" checked={mode === key} onChange={() => onChange(valueForHomePageMode(key, value))} /><span><strong>{title}</strong><small>{description}</small></span></label>)}</div>{mode === 'custom' && <label className="field"><span className="field-label">首页 HTML <code>index_page_content</code></span><textarea className="textarea code-input home-html-input" rows="10" value={value} onChange={(event) => onChange(event.target.value)} placeholder="<section>…</section>" /><small>保存后会替代文章列表。可在新窗口打开站点检查效果。</small></label>}</div>;
}

function GitHubNetworkSettings({ mode, proxyUrl, forced, onChange, notify }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const usingProxy = mode === 'proxy';
  async function testConnection() {
    setTesting(true);
    setResult(null);
    try {
      const payload = await api('/api/network/github/test', { method: 'POST', body: { mode, proxyUrl } });
      setResult(payload);
      notify(`GitHub 连接正常，当前经 ${payload.route === 'proxy' ? '代理' : '直连'}出口`);
    } catch (error) {
      setResult({ error: error.message });
      notify(error.message, true);
    } finally { setTesting(false); }
  }
  return <section className="panel settings-group github-network-settings"><header><div><h2>GitHub 网络出口</h2><p>只影响 OAuth 换取令牌和身份校验，不代理博客的其他请求。</p></div><button className="button subtle small" type="button" disabled={testing} onClick={testConnection}>{testing ? '测试中…' : '测试连接'}</button></header>
    <div className="home-mode-grid network-mode-grid" role="radiogroup" aria-label="GitHub 网络出口">
      {[['direct', '直接连接', '由当前服务器直接访问 GitHub。'], ['proxy', '通过代理', '仅 GitHub 服务端请求使用指定代理。']].map(([value, title, description]) => <label className={mode === value ? 'is-selected' : ''} key={value}><input type="radio" name="github-network-mode" value={value} checked={mode === value} disabled={forced} onChange={() => { onChange('github_proxy_mode', value); setResult(null); }} /><span><strong>{title}</strong><small>{description}</small></span></label>)}
    </div>
    <label className="field"><span className="field-label">代理地址 <code>github_proxy_url</code></span><input className="input code-input" value={proxyUrl} disabled={forced} onChange={(event) => { onChange('github_proxy_url', event.target.value); setResult(null); }} placeholder="socks5://proxy.internal:1080" /><small>建议使用私有网络内的代理地址；不要填写包含用户名或密码的公网代理。</small></label>
    {forced && <aside className="network-status is-forced"><strong>环境变量已接管</strong><span>当前出口由 GITHUB_PROXY_FORCE_MODE 强制指定，后台不能覆盖。</span></aside>}
    {result && <aside className={`network-status ${result.error ? 'is-error' : 'is-ok'}`}><strong>{result.error ? '连接失败' : `连接正常 · ${result.route === 'proxy' ? '代理' : '直连'}`}</strong><span>{result.error || result.checks.map((check) => `${check.name} ${check.statusCode} · ${check.latencyMs} ms`).join('；')}</span></aside>}
    {usingProxy && !proxyUrl && <aside className="network-status is-error"><strong>尚未填写代理地址</strong><span>保存或测试前请填写 SOCKS5 地址。</span></aside>}
  </section>;
}

function Settings({ notify }) {
  const [options, setOptions] = useState({});
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [networkForced, setNetworkForced] = useState(false);
  const setOption = (key, value) => setOptions((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    Promise.all([api('/api/option'), api('/api/page').catch(() => ({ pages: [] })), api('/api/network/github')])
      .then(([optionPayload, pagePayload, networkPayload]) => {
        const loaded = Object.fromEntries(optionPayload.options.map((item) => [item.key, item.value]));
        loaded.github_proxy_mode = networkPayload.config.mode;
        loaded.github_proxy_url = networkPayload.config.proxyUrl || '';
        setOptions(loaded); setPages(pagePayload.pages || []); setNetworkForced(Boolean(networkPayload.config.forced));
      })
      .catch((error) => notify(error.message, true)).finally(() => setLoading(false));
  }, [notify]);
  async function save(event) {
    event.preventDefault();
    const parsed = parseNavigationConfig(options.nav_links);
    const navigationError = parsed.error || validateNavigationGroups(parsed.groups);
    if (navigationError) { notify(navigationError, true); return; }
    setSaving(true);
    try { await api('/api/option', { method: 'PUT', body: { ...options, nav_links: serializeNavigationConfig(parsed.groups, true) } }); notify('站点设置已保存'); }
    catch (error) { notify(error.message, true); } finally { setSaving(false); }
  }
  if (loading) return <div className="loading-page"><div className="loading-bar"><i /></div></div>;
  return <form onSubmit={save}><PageHeader kicker="SITE CONFIGURATION" title="站点设置" description="管理品牌、搜索展示和全局内容。" actions={<button className="button primary" disabled={saving}>{saving ? '保存中…' : '保存全部设置'}</button>} />
    <div className="settings-stack">{SETTING_GROUPS.map((group) => <section className="panel settings-group" key={group.title}><header><div><h2>{group.title}</h2><p>{group.description}</p></div></header><div className="settings-fields">{group.fields.map(([key, label, type, placeholder]) => <label className={`field ${type === 'textarea' ? 'full' : ''}`} key={key}><span className="field-label">{label}<code>{key}</code></span>{type === 'text' ? <input className="input" value={options[key] || ''} placeholder={placeholder} onChange={(event) => setOption(key, event.target.value)} /> : <textarea className="textarea" rows="3" value={options[key] || ''} placeholder={placeholder} onChange={(event) => setOption(key, event.target.value)} />}</label>)}</div></section>)}
      <GitHubNetworkSettings mode={options.github_proxy_mode || 'direct'} proxyUrl={options.github_proxy_url || ''} forced={networkForced} onChange={setOption} notify={notify} />
      <section className="panel settings-group navigation-settings"><header><div><h2>导航菜单</h2><p>添加链接、调整顺序，并把常用页面组织成下拉菜单。</p></div><a className="button subtle small" href="/" target="_blank" rel="noreferrer">查看站点 ↗</a></header><NavigationEditor value={options.nav_links || ''} pages={pages} onChange={(value) => setOption('nav_links', value)} /></section>
      <section className="panel settings-group"><header><div><h2>首页与文章</h2><p>选择首页呈现方式，并设置每篇文章末尾的统一说明。</p></div></header><div className="settings-fields"><div className="full"><HomePageEditor value={options.index_page_content || ''} onChange={(value) => setOption('index_page_content', value)} /></div><label className="field full"><span className="field-label">文章版权说明 <code>copyright</code></span><textarea className="textarea" rows="4" value={options.copyright || ''} placeholder="例如：转载请注明作者与原文链接" onChange={(event) => setOption('copyright', event.target.value)} /><small>显示在所有文章正文之后，支持 HTML。</small></label></div></section>
    </div>
    <aside className="info-callout warm"><strong>关于自定义 HTML</strong><p>本站是单一所有者写入模式，因此会完整保留你发布的 HTML。HTML 页面仍运行在隔离沙箱中，不会获得后台登录态。</p></aside>
  </form>;
}

export default function App() {
  const route = useHashRoute();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState(null);
  const notify = useCallback((text, error = false) => setNotice({ text, error }), []);
  const clearNotice = useCallback(() => setNotice(null), []);
  useEffect(() => { api('/api/user/status').then((payload) => setUser(payload.user)).catch(() => setUser(null)).finally(() => setReady(true)); }, []);
  if (!ready) return <main className="loading-shell"><div className="loading-mark">B</div><div className="loading-bar"><i /></div></main>;
  if (!user) return <Login route={route} />;
  const editorMatch = route.match(/^editor(?:\/(.+))?$/);
  let content = <Posts notify={notify} />;
  if (editorMatch) content = <Editor id={editorMatch[1]} notify={notify} />;
  else if (route === 'analytics') content = <Analytics notify={notify} />;
  else if (route === 'microblog') content = <Microblog notify={notify} />;
  else if (route === 'files') content = <Files notify={notify} />;
  else if (route === 'settings') content = <Settings notify={notify} />;
  else if (route.startsWith('cli')) content = <CLI route={route} notify={notify} />;
  return <Layout user={user} route={route}><Notice notice={notice} clear={clearNotice} />{content}</Layout>;
}
