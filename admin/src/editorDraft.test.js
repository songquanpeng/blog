import test from 'node:test';
import assert from 'node:assert/strict';
import { clearEditorDraft, editorDraftKey, readEditorDraft, shouldRestoreEditorDraft, writeEditorDraft } from './editorDraft.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('editor drafts are isolated and omit passwords', () => {
  const storage = memoryStorage();
  const key = editorDraftKey('page-1');
  writeEditorDraft(storage, key, { title: '草稿', content: '正文', password: 'secret', id: 'page-1' }, new Date('2026-08-30T10:00:00Z'));
  const draft = readEditorDraft(storage, key);
  assert.equal(draft.page.title, '草稿');
  assert.equal(draft.page.password, undefined);
  assert.equal(draft.page.id, undefined);
  assert.equal(editorDraftKey(), 'blog-editor-draft:v1:new');
  clearEditorDraft(storage, key);
  assert.equal(readEditorDraft(storage, key), null);
});

test('only a draft newer than the server copy is restored', () => {
  const draft = { version: 1, savedAt: '2026-08-30T10:00:00Z', page: { content: 'local' } };
  assert.equal(shouldRestoreEditorDraft(draft, '2026-08-30T09:00:00Z'), true);
  assert.equal(shouldRestoreEditorDraft(draft, '2026-08-30T11:00:00Z'), false);
  assert.equal(shouldRestoreEditorDraft(null, '2026-08-30T09:00:00Z'), false);
});

test('corrupt draft data is ignored', () => {
  const storage = memoryStorage();
  storage.setItem('broken', '{');
  assert.equal(readEditorDraft(storage, 'broken'), null);
});
