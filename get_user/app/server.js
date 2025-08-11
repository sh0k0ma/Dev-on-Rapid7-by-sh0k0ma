const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec to get auth details
const specPath = path.join(__dirname, '..', 'spec', 'insightAccount-api-v1.json');
const apiSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

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
  // Allow specific supported regions
  const validRegions = ['us', 'eu', 'ap', 'ca', 'au'];
  return validRegions.includes(region.trim().toLowerCase());
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

    // Construct URL based on OpenAPI spec
    const baseUrl = `https://${region.trim()}.api.insight.rapid7.com/account`;
    const endpoint = '/api/1/users';
    const queryString = buildQueryString(filters);
    const fullUrl = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

    // Make request to Rapid7 API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        [authHeaderName]: apiKey,
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      // Try to parse error response
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      
      return res.status(response.status).json({
        error: 'API request failed',
        status: response.status,
        details: errorData
      });
    }

    // Parse and return successful response
    let users;
    try {
      users = JSON.parse(responseText);
    } catch {
      return res.status(500).json({ error: 'Invalid JSON response from API' });
    }

    // Ensure we return an array
    if (!Array.isArray(users)) {
      return res.status(500).json({ error: 'Expected array response from API' });
    }

  // Forward Rapid7's JSON array response directly
  res.json(users);

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
