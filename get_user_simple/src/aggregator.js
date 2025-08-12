const CONFIG = require('./config');
const { fetchAllUsersSingle, fetchUsersByRegion } = require('./api');

function dedupeById(items) {
  const map = new Map();
  for (const it of items) {
    const key = it && (it.id || it.user_id || it.uuid) || JSON.stringify(it);
    if (!map.has(key)) map.set(key, it);
  }
  return Array.from(map.values());
}

async function getAllUsers(apiKey) {
  if (CONFIG.MODE === 'all') {
    const users = await fetchAllUsersSingle(apiKey);
    return { users, regionsCovered: 1 };
  }
  if (CONFIG.MODE === 'region') {
    const regions = CONFIG.REGIONS && CONFIG.REGIONS.length ? CONFIG.REGIONS : [];
    const results = await Promise.all(regions.map(r => fetchUsersByRegion(apiKey, r).then(arr => arr.map(u => ({ ...u, region: u.region || r })))));
    const merged = dedupeById(results.flat());
    return { users: merged, regionsCovered: regions.length };
  }
  const err = new Error(`Unsupported MODE: ${CONFIG.MODE}`);
  err.exitCode = 3;
  throw err;
}

module.exports = { getAllUsers };
