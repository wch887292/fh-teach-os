// 鉴权封装：自动注入 Bearer token，401 时清 token 并抛专用错误
export const TOKEN_KEY = 'teachos-token';

export class AuthRequiredError extends Error {
  constructor(message) {
    super(message || '登录状态失效，请重新登录');
    this.name = 'AuthRequiredError';
    this.authRequired = true;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});

  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    throw new AuthRequiredError();
  }

  return response;
}

export function isAuthError(err) {
  return err instanceof AuthRequiredError || Boolean(err && err.authRequired === true);
}
