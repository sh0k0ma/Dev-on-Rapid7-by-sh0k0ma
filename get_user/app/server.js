const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec to get auth details
const specPath = path.join(__dirname, '..', 'spec', 'insightAccount-api-v1.json');
const apiSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

// Canonical regions list (single source of truth)
const regionsPath = path.join(__dirname, 'config', 'regions.json');
let canonicalRegions = [];
try {
  canonicalRegions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
} catch (e) {
  console.warn('Warning: Unable to load regions.json. Falling back to defaults.', e?.message);
  canonicalRegions = [
    { code: 'us', name: 'US (United States)' },
    { code: 'eu', name: 'EU (Europe)' },
    { code: 'ap', name: 'AP (Asia Pacific)' },
    { code: 'ca', name: 'CA (Canada)' },
    { code: 'au', name: 'AU (Australia)' }
  ];
}

// Get auth header name from OpenAPI spec
const authScheme = apiSpec.components.securitySchemes.ApiKeyAuth;
const authHeaderName = authScheme.name; // Should be 'X-Api-Key'

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Validate region
function validateRegion(region) {
  if (!region || typeof region !== 'string') {
    return false;
  }
  if (region.trim().toLowerCase() === 'all') return true;
  const validCodes = new Set(canonicalRegions.map(r => r.code.toLowerCase()));
  return validCodes.has(region.trim().toLowerCase());
}

// Build query string from filters
function buildQueryString(filters) {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters['platform-admin'] !== undefined) params.append('platform-admin', filters['platform-admin']);
  if (filters.email) params.append('email', filters.email);
  if (filters.first_name) params.append('first_name', filters.first_name);
  if (filters.last_name) params.append('last_name', filters.last_name);
  
  return params.toString();
}

// Helper to call Rapid7 users API for a single region
async function fetchUsersForRegion(regionCode, apiKey, queryString) {
  const baseUrl = `https://${regionCode.trim()}.api.insight.rapid7.com/account`;
  const endpoint = '/api/1/users';
  const fullUrl = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      [authHeaderName]: apiKey,
      'Accept': 'application/json'
    }
  });

  const text = await response.text();
  if (!response.ok) {
    let errorData;
    try { errorData = JSON.parse(text); } catch { errorData = { message: text }; }
    const err = new Error('API request failed');
    err.status = response.status;
    err.details = errorData;
    err.region = regionCode;
    throw err;
  }

  let data;
  try { data = JSON.parse(text); } catch {
    const err = new Error('Invalid JSON response from API');
    err.status = 500;
    err.region = regionCode;
    throw err;
  }
  if (!Array.isArray(data)) {
    const err = new Error('Expected array response from API');
    err.status = 500;
    err.region = regionCode;
    throw err;
  }
  return data;
}

// Regions API for frontend population (includes synthetic "all")
app.get('/api/regions', (_req, res) => {
  res.json({
    regions: [ { code: 'all', name: 'All Regions' }, ...canonicalRegions ]
  });
});

// API route to fetch users
app.post('/api/users', async (req, res) => {
  try {
    const { region, apiKey, filters = {} } = req.body;

    // Validate inputs
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    if (!validateRegion(region)) {
      return res.status(400).json({ error: 'Invalid region format' });
    }

    const queryString = buildQueryString(filters);
    const isAll = region.trim().toLowerCase() === 'all';

    if (!isAll) {
      // Single region
      const users = await fetchUsersForRegion(region, apiKey, queryString);
      return res.json(users);
    }

    // All regions: fan-out and merge
    const codes = canonicalRegions.map(r => r.code);
    const results = await Promise.allSettled(codes.map(code => fetchUsersForRegion(code, apiKey, queryString)));
    const merged = [];
    const seen = new Set();
    let firstError = null;
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const u of r.value) {
          const id = u && (u.id ?? `${u.email || ''}:${u.first_name || ''}:${u.last_name || ''}`);
          if (id && !seen.has(id)) {
            seen.add(id);
            merged.push(u);
          }
        }
      } else if (r.status === 'rejected' && !firstError) {
        firstError = r.reason;
      }
    }
    if (merged.length === 0 && firstError) {
      return res.status(firstError.status || 502).json({
        error: 'API request failed for all regions',
        details: firstError.details || { message: firstError.message },
      });
    }
    return res.json(merged);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
