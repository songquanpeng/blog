import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const PAGE_TYPES = ['文章', '代码', '公告', '讨论', '友链', 'HTML', '媒体', '时间线', '重定向', '文本'];
const EMPTY_PAGE = { type: 0, link: '', pageStatus: 1, commentStatus: 1, title: '', content: '', tag: 'Others', password: '', description: '' };

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

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`notification ${notice.error ? 'is-danger' : 'is-success'}`}><button className="delete" onClick={clear} />{notice.text}</div>;
}

function Login() {
  return <main className="login-shell"><section className="box login-box"><h1 className="title">博客管理</h1><p className="content">后台仅允许配置的 GitHub 账户访问。</p><a className="button is-dark is-fullwidth" href="/auth/github">使用 GitHub 登录</a><a className="button is-text is-fullwidth" href="/">返回博客</a></section></main>;
}

function Layout({ user, route, children }) {
  const items = [['posts', '页面'], ['editor', '新建'], ['files', '文件'], ['settings', '设置']];
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a className="admin-brand" href="/">Blog</a>
      <nav className="menu"><p className="menu-label">管理</p><ul className="menu-list">{items.map(([key, label]) => <li key={key}><a className={route.startsWith(key) ? 'is-active' : ''} href={`#/${key}`}>{label}</a></li>)}</ul></nav>
      <div className="admin-account">{user.avatar_url && <img src={user.avatar_url} alt="" />}<div><strong>{user.name || user.login}</strong><br /><a href="/auth/logout">退出</a></div></div>
    </aside>
    <main className="admin-content">{children}</main>
  </div>;
}

function Posts({ notify }) {
  const [pages, setPages] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setLoading(true); setPages((await api('/api/page')).pages || []); }
    catch (error) { notify(error.message, true); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => pages.filter((page) => [page.title, page.link, page.tag, page.description].join(' ').toLowerCase().includes(keyword.toLowerCase())), [pages, keyword]);
  async function remove(id) {
    if (!window.confirm('确认删除这个页面？此操作不可撤销。')) return;
    try { await api(`/api/page/${id}`, { method: 'DELETE' }); setPages((items) => items.filter((item) => item.id !== id)); notify('页面已删除'); }
    catch (error) { notify(error.message, true); }
  }
  return <section><div className="level"><div className="level-left"><h1 className="title">页面</h1></div><div className="level-right"><button className="button is-primary" onClick={() => go('editor')}>新建页面</button></div></div>
    <div className="field"><div className="control"><input className="input" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、链接、标签或描述" /></div></div>
    {loading ? <progress className="progress is-small is-primary" max="100" /> : <div className="table-container"><table className="table is-fullwidth is-hoverable"><thead><tr><th>标题</th><th>类型</th><th>状态</th><th>标签</th><th>阅读</th><th>操作</th></tr></thead><tbody>{filtered.map((page) => <tr key={page.id}><td><a href={`/page/${encodeURIComponent(page.link)}`} target="_blank" rel="noreferrer">{page.title || '无标题'}</a><small>{page.link}</small></td><td>{PAGE_TYPES[page.type] || page.type}</td><td><span className={`tag ${page.pageStatus === 1 ? 'is-success' : page.pageStatus === 2 ? 'is-warning' : 'is-light'}`}>{['撤回', '发布', '置顶', '隐藏'][page.pageStatus]}</span></td><td>{page.tag}</td><td>{page.view}</td><td><div className="buttons are-small"><button className="button" onClick={() => go(`editor/${page.id}`)}>编辑</button><a className="button" href={`/api/page/export/${page.id}`}>导出</a><button className="button is-danger is-light" onClick={() => remove(page.id)}>删除</button></div></td></tr>)}</tbody></table></div>}
  </section>;
}

function Editor({ id, notify }) {
  const [page, setPage] = useState(EMPTY_PAGE);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) { setPage({ ...EMPTY_PAGE }); return; }
    api(`/api/page/${id}`).then((payload) => setPage(payload.page)).catch((error) => notify(error.message, true));
  }, [id, notify]);
  function field(name, transform = (value) => value) {
    return (event) => setPage((current) => ({ ...current, [name]: transform(event.target.value) }));
  }
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const method = page.id ? 'PUT' : 'POST';
      const payload = await api('/api/page', { method, body: { ...page, type: Number(page.type), pageStatus: Number(page.pageStatus), commentStatus: Number(page.commentStatus) } });
      setPage((current) => ({ ...current, id: current.id || payload.id })); notify(page.id ? '页面已更新' : '页面已创建');
      if (!page.id) go(`editor/${payload.id}`);
    } catch (error) { notify(error.message, true); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save}><div className="level"><div className="level-left"><h1 className="title">{page.id ? '编辑页面' : '新建页面'}</h1></div><div className="level-right"><div className="buttons">{page.link && <a className="button" href={`/page/${encodeURIComponent(page.link)}`} target="_blank" rel="noreferrer">查看</a>}<button className={`button is-primary ${saving ? 'is-loading' : ''}`} disabled={saving}>保存</button></div></div></div>
    <div className="columns"><div className="column is-three-quarters"><div className="field"><label className="label">标题</label><input className="input" value={page.title || ''} onChange={field('title')} required maxLength="300" /></div><div className="field"><label className="label">描述（用于 SEO）</label><textarea className="textarea" rows="2" value={page.description || ''} onChange={field('description')} /></div><div className="field"><label className="label">内容</label><textarea className="textarea code-editor" value={page.content || ''} onChange={field('content')} spellCheck="false" required /></div></div>
      <div className="column"><div className="field"><label className="label">固定链接</label><input className="input" value={page.link || ''} onChange={field('link')} required /></div><div className="field"><label className="label">类型</label><div className="select is-fullwidth"><select value={page.type} onChange={field('type', Number)}>{PAGE_TYPES.map((label, index) => <option value={index} key={label}>{label}</option>)}</select></div></div><div className="field"><label className="label">状态</label><div className="select is-fullwidth"><select value={page.pageStatus} onChange={field('pageStatus', Number)}><option value="0">撤回</option><option value="1">发布</option><option value="2">置顶</option><option value="3">隐藏（noindex）</option></select></div></div><div className="field"><label className="label">标签（分号分隔）</label><input className="input" value={page.tag || ''} onChange={field('tag')} /></div><div className="field"><label className="label">阅读密码</label><input className="input" value={page.password || ''} onChange={field('password')} /></div><label className="checkbox"><input type="checkbox" checked={Number(page.commentStatus) === 1} onChange={(event) => setPage((current) => ({ ...current, commentStatus: event.target.checked ? 1 : 0 }))} /> 允许评论</label></div></div>
  </form>;
}

function Files({ notify }) {
  const [files, setFiles] = useState([]);
  const [upload, setUpload] = useState(null);
  const load = useCallback(() => api('/api/file').then((payload) => setFiles(payload.files || [])).catch((error) => notify(error.message, true)), [notify]);
  useEffect(() => { load(); }, [load]);
  async function submit(event) {
    event.preventDefault(); if (!upload) return;
    const body = new FormData(event.currentTarget);
    try { await api('/api/file', { method: 'POST', body }); event.currentTarget.reset(); setUpload(null); await load(); notify('文件已上传'); }
    catch (error) { notify(error.message, true); }
  }
  async function remove(id) {
    if (!window.confirm('确认删除这个文件？')) return;
    try { await api(`/api/file/${encodeURIComponent(id)}`, { method: 'DELETE' }); await load(); notify('文件已删除'); }
    catch (error) { notify(error.message, true); }
  }
  return <section><h1 className="title">文件</h1><form className="box" onSubmit={submit}><div className="field"><label className="label">上传文件</label><input className="input" type="file" name="file" onChange={(event) => setUpload(event.target.files[0])} required /></div><div className="field"><input className="input" name="description" placeholder="描述" /></div><button className="button is-primary" disabled={!upload}>上传</button></form><div className="table-container"><table className="table is-fullwidth"><thead><tr><th>文件名</th><th>描述</th><th>地址</th><th /></tr></thead><tbody>{files.map((file) => <tr key={file.id}><td>{file.filename}</td><td>{file.description}</td><td><a href={file.path} target="_blank" rel="noreferrer">{file.path}</a></td><td><button className="button is-small is-danger is-light" onClick={() => remove(file.id)}>删除</button></td></tr>)}</tbody></table></div></section>;
}

function Settings({ notify }) {
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/api/option').then((payload) => setOptions(Object.fromEntries(payload.options.map((item) => [item.key, item.value])))).catch((error) => notify(error.message, true)).finally(() => setLoading(false)); }, [notify]);
  const preferred = ['site_name', 'motto', 'description', 'author', 'domain', 'language', 'favicon', 'brand_image', 'copyright', 'nav_links', 'index_page_content'];
  async function save(event) { event.preventDefault(); try { await api('/api/option', { method: 'PUT', body: options }); notify('设置已保存'); } catch (error) { notify(error.message, true); } }
  if (loading) return <progress className="progress is-small is-primary" max="100" />;
  return <form onSubmit={save}><div className="level"><div className="level-left"><h1 className="title">设置</h1></div><div className="level-right"><button className="button is-primary">保存</button></div></div><div className="settings-grid">{preferred.map((key) => <div className="field" key={key}><label className="label">{key}</label>{['description', 'copyright', 'nav_links', 'index_page_content'].includes(key) ? <textarea className="textarea" rows={key === 'nav_links' ? 8 : 3} value={options[key] || ''} onChange={(event) => setOptions({ ...options, [key]: event.target.value })} /> : <input className="input" value={options[key] || ''} onChange={(event) => setOptions({ ...options, [key]: event.target.value })} />}</div>)}</div><div className="notification is-info is-light">主题固定为 Bulma；旧的 <code>theme</code> 设置会被忽略。危险的自定义页头/页脚 HTML 默认不会执行。</div></form>;
}

export default function App() {
  const route = useHashRoute();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState(null);
  const notify = useCallback((text, error = false) => setNotice({ text, error }), []);
  useEffect(() => { api('/api/user/status').then((payload) => setUser(payload.user)).catch(() => setUser(null)).finally(() => setReady(true)); }, []);
  if (!ready) return <main className="loading-shell"><progress className="progress is-small is-primary" max="100" /></main>;
  if (!user) return <Login />;
  const editorMatch = route.match(/^editor(?:\/(.+))?$/);
  let content = <Posts notify={notify} />;
  if (editorMatch) content = <Editor id={editorMatch[1]} notify={notify} />;
  else if (route === 'files') content = <Files notify={notify} />;
  else if (route === 'settings') content = <Settings notify={notify} />;
  return <Layout user={user} route={route}><Notice notice={notice} clear={() => setNotice(null)} />{content}</Layout>;
}
