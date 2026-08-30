export const EMPTY_NAV_GROUP = { key: '', value: [] };

export function parseNavigationConfig(raw) {
  const source = String(raw ?? '').trim();
  if (!source) return { groups: [], error: '' };
  try {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) throw new Error('导航配置必须是一个分组列表');
    const groups = parsed.map((group, groupIndex) => {
      if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error(`第 ${groupIndex + 1} 个分组格式不正确`);
      if (!Array.isArray(group.value)) throw new Error(`分组「${group.key || groupIndex + 1}」缺少链接列表`);
      return {
        key: typeof group.key === 'string' ? group.key : '',
        value: group.value.map((item, itemIndex) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`分组 ${groupIndex + 1} 的第 ${itemIndex + 1} 个链接格式不正确`);
          return { text: typeof item.text === 'string' ? item.text : '', link: typeof item.link === 'string' ? item.link : '' };
        }),
      };
    });
    return { groups, error: '' };
  } catch (error) {
    return { groups: [], error: error instanceof SyntaxError ? `JSON 解析失败：${error.message}` : error.message };
  }
}

export function serializeNavigationConfig(groups, trim = false) {
  const clean = (value) => trim ? String(value ?? '').trim() : String(value ?? '');
  return JSON.stringify(groups.map((group) => ({
    key: clean(group.key),
    value: group.value.map((item) => ({ text: clean(item.text), link: clean(item.link) })),
  })));
}

export function isSafeNavigationURL(value) {
  const link = String(value ?? '').trim();
  if (link.startsWith('/') && !link.startsWith('//')) return true;
  try {
    const parsed = new URL(link);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.host);
  } catch {
    return false;
  }
}

export function validateNavigationGroups(groups) {
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    if (!String(group.key ?? '').trim()) return `请填写第 ${groupIndex + 1} 个分组的名称`;
    for (let itemIndex = 0; itemIndex < group.value.length; itemIndex += 1) {
      const item = group.value[itemIndex];
      if (!String(item.text ?? '').trim()) return `请填写「${group.key}」第 ${itemIndex + 1} 个链接的名称`;
      if (!isSafeNavigationURL(item.link)) return `「${item.text || group.key}」的链接无效，请使用站内 /path 或完整的 http(s) 地址`;
    }
  }
  return '';
}

export function homePageMode(value) {
  if (value === '404') return 'disabled';
  return value ? 'custom' : 'list';
}

export function valueForHomePageMode(mode, currentValue = '') {
  if (mode === 'disabled') return '404';
  if (mode === 'list') return '';
  return currentValue && currentValue !== '404' ? currentValue : '<section>\n  <h1>欢迎来到我的博客</h1>\n</section>';
}
