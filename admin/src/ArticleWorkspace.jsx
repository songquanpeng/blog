import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { LanguageDescription } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdownHighlight from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark-dimmed.css';
import { api } from './api.js';

const CODE_LANGUAGES = [
  LanguageDescription.of({ name: 'JavaScript', alias: ['js', 'jsx'], load: () => import('@codemirror/lang-javascript').then(({ javascript }) => javascript({ jsx: true })) }),
  LanguageDescription.of({ name: 'TypeScript', alias: ['ts', 'tsx'], load: () => import('@codemirror/lang-javascript').then(({ javascript }) => javascript({ jsx: true, typescript: true })) }),
  LanguageDescription.of({ name: 'Python', alias: ['py'], load: () => import('@codemirror/lang-python').then(({ python }) => python()) }),
  LanguageDescription.of({ name: 'Go', load: () => import('@codemirror/lang-go').then(({ go: goLanguage }) => goLanguage()) }),
  LanguageDescription.of({ name: 'SQL', load: () => import('@codemirror/lang-sql').then(({ sql }) => sql()) }),
  LanguageDescription.of({ name: 'JSON', load: () => import('@codemirror/lang-json').then(({ json: jsonLanguage }) => jsonLanguage()) }),
  LanguageDescription.of({ name: 'CSS', load: () => import('@codemirror/lang-css').then(({ css: cssLanguage }) => cssLanguage()) }),
  LanguageDescription.of({ name: 'HTML', alias: ['xml'], load: () => Promise.resolve(html()) }),
];

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('go', go);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdownHighlight);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

const TOOLBAR = [
  { label: 'H2', title: '二级标题', prefix: '## ', block: true, placeholder: '小标题' },
  { label: 'B', title: '粗体', prefix: '**', suffix: '**', placeholder: '重点文字' },
  { label: 'I', title: '斜体', prefix: '*', suffix: '*', placeholder: '强调文字' },
  { label: '↗', title: '链接', prefix: '[', suffix: '](https://)', placeholder: '链接文字' },
  { label: '`', title: '行内代码', prefix: '`', suffix: '`', placeholder: 'code' },
  { label: '<>', title: '代码块', prefix: '```\n', suffix: '\n```', placeholder: 'const hello = "world";' },
  { label: '❝', title: '引用', prefix: '> ', block: true, placeholder: '引用内容' },
  { label: '•', title: '无序列表', prefix: '- ', block: true, placeholder: '列表项' },
  { label: '1.', title: '有序列表', prefix: '1. ', block: true, placeholder: '列表项' },
];

function fileMarkup(file, raw = false) {
  const name = (file.description || file.filename || '文件').replace(/[\[\]]/g, '');
  const image = /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.path || file.filename || '');
  if (raw) {
    const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return image ? `<img src="${escape(file.path)}" alt="${escape(name)}">` : `<a href="${escape(file.path)}">${escape(name)}</a>`;
  }
  return `${image ? '!' : ''}[${name}](${file.path})`;
}

function MediaPicker({ open, onClose, onInsert, notify }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFiles((await api('/api/file')).files || []); }
    catch (error) { notify(error.message, true); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function upload(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setUploading(true);
    const body = new FormData();
    body.append('file', selected);
    body.append('description', selected.name.replace(/\.[^.]+$/, ''));
    try {
      const payload = await api('/api/file', { method: 'POST', body });
      setFiles((current) => [payload.file, ...current]);
      onInsert(payload.file);
      notify('文件已上传并插入正文');
      onClose();
    } catch (error) { notify(error.message, true); }
    finally { setUploading(false); event.target.value = ''; }
  }

  if (!open) return null;
  return <div className="media-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="media-picker" role="dialog" aria-modal="true" aria-label="插入文件">
      <header><div><h3>插入图片或附件</h3><p>选择媒体库文件，或上传后直接插入光标位置。</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭">×</button></header>
      <button className="media-upload-shortcut" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}><span>↑</span><strong>{uploading ? '上传中…' : '上传新文件'}</strong><small>图片会插入为 Markdown 图片，其他文件插入为链接</small></button>
      <input ref={inputRef} className="sr-only" type="file" onChange={upload} />
      <div className="media-picker-list">{loading ? <div className="loading-bar"><i /></div> : files.length === 0 ? <p className="media-empty">媒体库还是空的，可以从上方上传第一个文件。</p> : files.map((file) => {
        const image = /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.path || file.filename || '');
        return <button key={file.id} type="button" className="media-picker-item" onClick={() => { onInsert(file); onClose(); }}>
          <span className="media-thumb">{image ? <img src={file.path} alt="" /> : <i>FILE</i>}</span>
          <span><strong>{file.filename}</strong><small>{file.description || file.path}</small></span><b>插入</b>
        </button>;
      })}</div>
    </section>
  </div>;
}

function DraftPreview({ content, type }) {
  const [rendered, setRendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const previewRef = useRef(null);
  const raw = Number(type) === 5;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!content.trim()) { setRendered(''); setError(''); return; }
      setLoading(true);
      try {
        const payload = await api('/api/page/preview', { method: 'POST', signal: controller.signal, body: { content, type: Number(type) } });
        setRendered(payload.content || ''); setError('');
      } catch (requestError) { if (requestError.name !== 'AbortError') setError(requestError.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 320);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [content, type]);

  useEffect(() => {
    if (raw || !previewRef.current) return;
    previewRef.current.querySelectorAll('pre code').forEach((block) => { delete block.dataset.highlighted; hljs.highlightElement(block); });
  }, [rendered, raw]);

  if (!content.trim()) return <div className="draft-preview-empty"><span>✦</span><h3>预览会出现在这里</h3><p>开始写作后，渲染结果会自动更新。</p></div>;
  if (error) return <div className="draft-preview-empty is-error"><h3>暂时无法渲染</h3><p>{error}</p></div>;
  return <div className={`draft-preview-shell ${loading ? 'is-refreshing' : ''}`}>
    {raw ? <iframe title="HTML 草稿预览" sandbox="allow-scripts allow-forms allow-popups" srcDoc={rendered} /> : <article ref={previewRef} className="draft-preview article-content" dangerouslySetInnerHTML={{ __html: rendered }} />}
  </div>;
}

export default function ArticleWorkspace({ content, onChange, type, notify, compact = false, onSubmitShortcut }) {
  const [mode, setMode] = useState(() => window.innerWidth < (compact ? 1180 : 900) ? 'write' : 'split');
  const [fullscreen, setFullscreen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const viewRef = useRef(null);
  const editorExtensions = useMemo(() => [Number(type) === 5 ? html() : markdown({ codeLanguages: CODE_LANGUAGES }), EditorView.lineWrapping], [type]);

  useEffect(() => {
    document.body.classList.toggle('editor-fullscreen-open', fullscreen);
    const leaveFullscreen = (event) => { if (event.key === 'Escape') setFullscreen(false); };
    if (fullscreen) window.addEventListener('keydown', leaveFullscreen);
    return () => {
      window.removeEventListener('keydown', leaveFullscreen);
      document.body.classList.remove('editor-fullscreen-open');
    };
  }, [fullscreen]);

  const insertText = useCallback((prefix, suffix = '', placeholder = '', block = false) => {
    const view = viewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.doc.sliceString(from, to);
    const lineStart = view.state.doc.lineAt(from).from;
    const start = block && from !== lineStart ? `\n${prefix}` : prefix;
    const body = selected || placeholder;
    const inserted = `${start}${body}${suffix}`;
    const bodyStart = from + start.length;
    view.dispatch({
      changes: { from, to, insert: inserted },
      selection: { anchor: bodyStart, head: bodyStart + body.length },
      scrollIntoView: true,
    });
    view.focus();
  }, []);

  const insertFile = useCallback((file) => {
    const markup = `\n${fileMarkup(file, Number(type) === 5)}\n`;
    const view = viewRef.current;
    if (!view || mode === 'preview') { onChange(`${content}${markup}`); return; }
    const { from } = view.state.selection.main;
    view.dispatch({ changes: { from, insert: markup }, selection: { anchor: from + markup.length }, scrollIntoView: true });
    view.focus();
  }, [content, mode, onChange, type]);

  const uploadDroppedFiles = useCallback(async (fileList, position) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    const view = viewRef.current;
    if (view && Number.isFinite(position)) view.dispatch({ selection: { anchor: position } });
    setUploading(true);
    try {
      for (const file of selected) {
        const body = new FormData();
        body.append('file', file);
        body.append('description', file.name.replace(/\.[^.]+$/, ''));
        const payload = await api('/api/file', { method: 'POST', body });
        insertFile(payload.file);
      }
      notify(`${selected.length} 个文件已上传并插入正文`);
    } catch (error) { notify(error.message, true); }
    finally { setUploading(false); }
  }, [insertFile, notify]);

  const dropHandlers = useMemo(() => EditorView.domEventHandlers({
    drop(event, view) {
      if (!event.dataTransfer?.files?.length) return false;
      event.preventDefault();
      uploadDroppedFiles(event.dataTransfer.files, view.posAtCoords({ x: event.clientX, y: event.clientY }));
      return true;
    },
    paste(event) {
      if (!event.clipboardData?.files?.length) return false;
      event.preventDefault(); uploadDroppedFiles(event.clipboardData.files); return true;
    },
    keydown(event) {
      if (!onSubmitShortcut || !(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return false;
      event.preventDefault(); onSubmitShortcut(); return true;
    },
  }), [onSubmitShortcut, uploadDroppedFiles]);

  return <section className={`writing-workspace mode-${mode}${compact ? ' is-compact' : ''}${fullscreen ? ' is-fullscreen' : ''}`}>
    <div className="writing-toolbar">
      <div className="format-actions" aria-label="Markdown 格式工具">
        {Number(type) !== 5 && TOOLBAR.map((tool) => <button key={tool.title} type="button" title={mode === 'preview' ? '切换到写作视图后使用格式工具' : tool.title} disabled={mode === 'preview'} onClick={() => insertText(tool.prefix, tool.suffix, tool.placeholder, tool.block)} className={tool.label === 'B' ? 'is-bold' : tool.label === 'I' ? 'is-italic' : ''}>{tool.label}</button>)}
        <button className="insert-media-button" type="button" onClick={() => setPickerOpen(true)} title="插入图片或附件">▧ <span>文件</span></button>
        {uploading && <span className="toolbar-status">上传中…</span>}
      </div>
      <div className="workspace-controls">
        <div className="view-switch" aria-label="编辑器视图">
          <button type="button" className={mode === 'write' ? 'is-active' : ''} onClick={() => setMode('write')}>写作</button>
          <button type="button" className={mode === 'split' ? 'is-active' : ''} onClick={() => setMode('split')}>分栏</button>
          <button type="button" className={mode === 'preview' ? 'is-active' : ''} onClick={() => setMode('preview')}>预览</button>
        </div>
        <button className="fullscreen-button" type="button" onClick={() => setFullscreen((value) => !value)} aria-pressed={fullscreen} title={fullscreen ? '退出全屏（Esc）' : '全屏写作'}><b aria-hidden="true">{fullscreen ? '×' : '⛶'}</b><span>{fullscreen ? '退出' : '全屏'}</span></button>
      </div>
    </div>
    <div className="writing-panes">
      {mode !== 'preview' && <div className="editor-pane" onDragOver={(event) => { if (event.dataTransfer?.types?.includes('Files')) event.preventDefault(); }}>
        <CodeMirror value={content} onChange={onChange} onCreateEditor={(view) => { viewRef.current = view; }} extensions={[...editorExtensions, dropHandlers]} placeholder={Number(type) === 5 ? '<main>从这里开始写 HTML…</main>' : '# 从这里开始写作…'} basicSetup={{ foldGutter: false, highlightActiveLineGutter: false, allowMultipleSelections: true, indentOnInput: true, bracketMatching: true, closeBrackets: true, autocompletion: true, rectangularSelection: false, crosshairCursor: false, highlightActiveLine: true, highlightSelectionMatches: true, closeBracketsKeymap: true, searchKeymap: true }} />
        <div className="editor-drop-hint">可直接拖入或粘贴图片 · {(content || '').length.toLocaleString()} 字符</div>
      </div>}
      {mode !== 'write' && <div className="preview-pane"><div className="preview-label"><span>实时预览</span><small>使用与前台一致的渲染规则</small></div><DraftPreview content={content} type={type} /></div>}
    </div>
    <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onInsert={insertFile} notify={notify} />
  </section>;
}
