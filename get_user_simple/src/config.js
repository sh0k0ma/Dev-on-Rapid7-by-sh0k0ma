// Configuration for API endpoints and behavior
// Edit these values to match your backend.

const CONFIG = {
  // Base URL of your API
  // Rapid7 Insight Account API uses region in the hostname
  // Example: https://us.api.insight.rapid7.com/account
  BASE_URL: process.env.BASE_URL || 'https://{region}.api.insight.rapid7.com/account',

  // Modes: use single-call endpoint or per-region endpoints
  // Users endpoint path
  ALL_USERS_PATH: process.env.ALL_USERS_PATH || '/api/1/users',
  USERS_BY_REGION_PATH: process.env.USERS_BY_REGION_PATH || '/api/1/users',

  // Header mode: 'bearer' or 'x-api-key'
  // Rapid7 uses X-Api-Key
  HEADER_MODE: (process.env.HEADER_MODE || 'x-api-key').toLowerCase(),

  // Regions to iterate when using region mode (leave empty to imply single endpoint mode)
  REGIONS: (process.env.REGIONS || 'us,eu,ap,ca,au').split(',').map(r => r.trim()).filter(Boolean),

  // Pagination settings
  PAGINATION: {
    // Strategy: 'cursor' | 'offset' | 'none'
  STRATEGY: (process.env.PAGINATION_STRATEGY || 'none').toLowerCase(),

    // For 'cursor' strategy
    CURSOR_PARAM: process.env.CURSOR_PARAM || 'cursor',
    NEXT_CURSOR_PATH: process.env.NEXT_CURSOR_PATH || 'nextCursor', // JSON path for next cursor

    // For 'offset' strategy
    LIMIT_PARAM: process.env.LIMIT_PARAM || 'limit',
    OFFSET_PARAM: process.env.OFFSET_PARAM || 'offset',
    PAGE_SIZE: parseInt(process.env.PAGE_SIZE || '100', 10),

    // Path to items array in response (dot notation)
    ITEMS_PATH: process.env.ITEMS_PATH || 'items'
  },

  // Which mode to use by default: 'all' (single endpoint) or 'region'
  // Default to region mode to cover all regions
  MODE: (process.env.MODE || 'region').toLowerCase(),

  // Maximum retries for rate limits or transient errors
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '5', 10),
  INITIAL_BACKOFF_MS: parseInt(process.env.INITIAL_BACKOFF_MS || '500', 10),
  BACKOFF_FACTOR: parseFloat(process.env.BACKOFF_FACTOR || '2'),
};

module.exports = CONFIG;
