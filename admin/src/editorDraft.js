const DRAFT_PREFIX = 'blog-editor-draft:v1:';
const DRAFT_FIELDS = ['type', 'link', 'pageStatus', 'commentStatus', 'title', 'content', 'tag', 'description'];

export function editorDraftKey(id) {
  return `${DRAFT_PREFIX}${id || 'new'}`;
}

export function readEditorDraft(storage, key) {
  try {
    if (!storage) return null;
    const parsed = JSON.parse(storage.getItem(key));
    return parsed && parsed.version === 1 && parsed.page && typeof parsed.savedAt === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeEditorDraft(storage, key, page, now = new Date()) {
  if (!storage) throw new Error('browser storage unavailable');
  const safePage = {};
  DRAFT_FIELDS.forEach((field) => { safePage[field] = page[field]; });
  const draft = { version: 1, savedAt: now.toISOString(), page: safePage };
  storage.setItem(key, JSON.stringify(draft));
  return draft;
}

export function clearEditorDraft(storage, key) {
  try { storage?.removeItem(key); } catch { /* private mode */ }
}

export function shouldRestoreEditorDraft(draft, serverUpdatedAt) {
  if (!draft) return false;
  const draftTime = Date.parse(draft.savedAt);
  const serverTime = Date.parse(serverUpdatedAt || '');
  return Number.isFinite(draftTime) && (!Number.isFinite(serverTime) || draftTime > serverTime);
}
