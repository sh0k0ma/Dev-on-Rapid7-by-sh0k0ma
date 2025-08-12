// HTTP request layer using built-in https
const https = require('https');
const { URL } = require('url');
const CONFIG = require('./config');
const { withRetry } = require('./util/retry');

function buildHeaders(apiKey) {
  const headers = { 'Accept': 'application/json' };
  if (CONFIG.HEADER_MODE === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (CONFIG.HEADER_MODE === 'x-api-key') {
    headers['X-Api-Key'] = apiKey;
  } else {
    const err = new Error(`Unsupported HEADER_MODE: ${CONFIG.HEADER_MODE}`);
    err.exitCode = 3;
    throw err;
  }
  return headers;
}

function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    const err = new Error('Failed to parse JSON from API');
    err.exitCode = 2;
    throw err;
  }
}

function getJson(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      method: 'GET',
      headers,
    };
    const req = https.request(u, options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const status = res.statusCode || 0;
        if (status === 401 || status === 403) {
          const err = new Error('Invalid API key or insufficient permissions');
          err.status = status;
          err.exitCode = 1;
          return reject(err);
        }
        if (status >= 400) {
          const err = new Error(`HTTP ${status}`);
          err.status = status;
          return reject(err);
        }
        try {
          const json = data ? parseJsonSafe(data) : {};
          resolve({ json, status, headers: res.headers });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', (err) => {
      err.exitCode = 2;
      reject(err);
    });
    req.end();
  });
}

function getItemsAtPath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

async function fetchAllUsersSingle(apiKey) {
  const headers = buildHeaders(apiKey);
  const base = CONFIG.BASE_URL.replace(/\/$/, '').replace('{region}', CONFIG.REGIONS?.[0] || 'us');
  const path = CONFIG.ALL_USERS_PATH.startsWith('/') ? CONFIG.ALL_USERS_PATH : `/${CONFIG.ALL_USERS_PATH}`;
  const url = `${base}${path}`;

  const items = [];

  if (CONFIG.PAGINATION.STRATEGY === 'none') {
    const { json } = await withRetry(() => getJson(url, headers), {
      retries: CONFIG.MAX_RETRIES,
      initialDelayMs: CONFIG.INITIAL_BACKOFF_MS,
      factor: CONFIG.BACKOFF_FACTOR,
      onRetry: ({ attempt, delay, status }) => {
        if (status === 429) {
          console.error(`Rate limited (429). Retry #${attempt} in ${delay}ms...`);
        }
      }
    });
    const arr = Array.isArray(json) ? json : getItemsAtPath(json, CONFIG.PAGINATION.ITEMS_PATH) || [];
    items.push(...arr);
    return items;
  }

  if (CONFIG.PAGINATION.STRATEGY === 'cursor') {
    let cursor = undefined;
    while (true) {
      const u = new URL(url);
      if (cursor) u.searchParams.set(CONFIG.PAGINATION.CURSOR_PARAM, cursor);
      const { json } = await withRetry(() => getJson(u.toString(), headers), {
        retries: CONFIG.MAX_RETRIES,
        initialDelayMs: CONFIG.INITIAL_BACKOFF_MS,
        factor: CONFIG.BACKOFF_FACTOR,
        onRetry: ({ attempt, delay, status }) => {
          if (status === 429) {
            console.error(`Rate limited (429). Retry #${attempt} in ${delay}ms...`);
          }
        }
      });
      const arr = Array.isArray(json) ? json : getItemsAtPath(json, CONFIG.PAGINATION.ITEMS_PATH) || [];
      items.push(...arr);
      const nextCursor = getItemsAtPath(json, CONFIG.PAGINATION.NEXT_CURSOR_PATH);
      if (!nextCursor) break;
      cursor = nextCursor;
    }
    return items;
  }

  if (CONFIG.PAGINATION.STRATEGY === 'offset') {
    let offset = 0;
    const limit = CONFIG.PAGINATION.PAGE_SIZE;
    while (true) {
      const u = new URL(url);
      u.searchParams.set(CONFIG.PAGINATION.LIMIT_PARAM, String(limit));
      u.searchParams.set(CONFIG.PAGINATION.OFFSET_PARAM, String(offset));
      const { json } = await withRetry(() => getJson(u.toString(), headers), {
        retries: CONFIG.MAX_RETRIES,
        initialDelayMs: CONFIG.INITIAL_BACKOFF_MS,
        factor: CONFIG.BACKOFF_FACTOR,
        onRetry: ({ attempt, delay, status }) => {
          if (status === 429) {
            console.error(`Rate limited (429). Retry #${attempt} in ${delay}ms...`);
          }
        }
      });
      const arr = Array.isArray(json) ? json : getItemsAtPath(json, CONFIG.PAGINATION.ITEMS_PATH) || [];
      items.push(...arr);
      if (!arr.length) break;
      offset += arr.length;
      if (arr.length < limit) break;
    }
    return items;
  }

  const err = new Error(`Unsupported pagination strategy: ${CONFIG.PAGINATION.STRATEGY}`);
  err.exitCode = 3;
  throw err;
}

async function fetchUsersByRegion(apiKey, region) {
  const headers = buildHeaders(apiKey);
  const base = CONFIG.BASE_URL.replace(/\/$/, '').replace('{region}', encodeURIComponent(region));
  const templ = CONFIG.USERS_BY_REGION_PATH.startsWith('/') ? CONFIG.USERS_BY_REGION_PATH : `/${CONFIG.USERS_BY_REGION_PATH}`;
  const path = templ; // path has no region placeholder; region is in host
  const url = `${base}${path}`;

  // Reuse the pagination logic by temporarily overriding ALL_USERS_PATH
  const prevAllUsersPath = CONFIG.ALL_USERS_PATH;
  const prevMode = CONFIG.MODE;
  try {
    CONFIG.ALL_USERS_PATH = path;
    CONFIG.MODE = 'all';
    return await fetchAllUsersSingle(apiKey);
  } finally {
    CONFIG.ALL_USERS_PATH = prevAllUsersPath;
    CONFIG.MODE = prevMode;
  }
}

module.exports = {
  fetchAllUsersSingle,
  fetchUsersByRegion,
};
