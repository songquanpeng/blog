export async function api(path, options = {}) {
  const request = { credentials: 'same-origin', ...options };
  if (request.body && !(request.body instanceof FormData)) {
    request.headers = { 'Content-Type': 'application/json', ...(request.headers || {}) };
    request.body = JSON.stringify(request.body);
  }
  const response = await fetch(path, request);
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : { status: response.ok };
  if (!response.ok || payload.status === false) {
    const error = new Error(payload.message || `请求失败 (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}
