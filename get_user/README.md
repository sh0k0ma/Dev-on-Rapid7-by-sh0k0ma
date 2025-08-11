# Rapid7 Insight Account Users

A Node.js web application to list and export Rapid7 Insight Account users via the Insight Account API.

## Overview

This application provides a simple web interface to:
- Connect to the Rapid7 Insight Account API using your API key and region
- List all users in your account with optional filtering
- Export user data to CSV format
- View user details including status, admin privileges, and last login information

## Features

- **Web Interface**: Simple HTML form at `http://localhost:3000/`
- **API Integration**: Uses the official Insight Account API (`/api/1/users` endpoint)
- **Filtering**: Filter users by status, platform admin role, email, first name, or last name
- **CSV Export**: Download user data as CSV with UTF-8 BOM for Excel compatibility
- **Error Handling**: Displays API errors with correlation IDs for support
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. **Prerequisites**: Node.js 18+ is required

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Usage

### Starting the Application

```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

The application will start on `http://localhost:3000`

### Using the Web Interface

1. **Open your browser** to `http://localhost:3000`

2. **Enter your details**:
   - **Region**: Select your Rapid7 region from the dropdown (US, EU, AP, CA, AU)
   - **API Key**: Your Insight Platform API key

3. **Optional Filters**:
   - **Status**: Filter by ACTIVE, DISABLED, or PENDING users
   - **Platform Admin**: Show only platform administrators
   - **Email**: Filter by specific email address
   - **First Name**: Filter by first name
   - **Last Name**: Filter by last name

4. **Click "Get Users"** to fetch the data

5. **Export Results**: Click "Export CSV" to download the user list

### API Key Requirements

Your API key must be an **Insight Platform API key** with permissions to read user information via the Account API. The key should have access to the `/api/1/users` endpoint.

### Region Selection

Select the region that matches your Rapid7 Insight platform from the dropdown:
- **US**: United States (`us.api.insight.rapid7.com`)
- **EU**: Europe (`eu.api.insight.rapid7.com`) 
- **AP**: Asia Pacific (`ap.api.insight.rapid7.com`)
- **CA**: Canada (`ca.api.insight.rapid7.com`)
- **AU**: Australia (`au.api.insight.rapid7.com`)

The application constructs the API base URL as: `https://[region].api.insight.rapid7.com/account`

## Technical Details

### Architecture

- **Backend**: Express.js server that proxies requests to Rapid7 API
- **Frontend**: Vanilla HTML/CSS/JavaScript with no frameworks
- **API Spec**: Uses `insightAccount-api-v1.json` as source of truth for endpoints and authentication

### Authentication

The application reads authentication details from the OpenAPI specification:
- **Header Name**: `X-Api-Key` (from `components.securitySchemes.ApiKeyAuth`)
- **Location**: HTTP header
- **Type**: API Key

### API Endpoints

The application calls:
```
GET https://[region].api.insight.rapid7.com/account/api/1/users
```

With optional query parameters:
- `status`: ACTIVE, DISABLED, or PENDING
- `platform-admin`: true/false
- `email`: Email address filter
- `first_name`: First name filter  
- `last_name`: Last name filter

### CSV Export Format

The exported CSV includes these columns:
- ID, Email, First Name, Last Name, Status
- Platform Admin, Federated, Last Login, Timezone

Files are exported with UTF-8 BOM encoding for proper Excel compatibility.

## Security Notes

- API keys are submitted from the browser form on each request
- Keys are not stored server-side or in localStorage
- All API calls are proxied through the Express server (not called directly from browser)
- Region values are validated to prevent injection attacks

## Error Handling

The application displays detailed error information including:
- HTTP status codes
- Error codes and messages from the Rapid7 API
- Correlation IDs for support requests
- Network connectivity issues

## Troubleshooting

### Common Issues

1. **403 Forbidden**: API key lacks permissions for the Account API
2. **401 Unauthorized**: Invalid or expired API key
3. **404 Not Found**: Incorrect region or API endpoint not available
4. **Network errors**: Check firewall/proxy settings

### Support Information

When contacting Rapid7 support, include:
- The correlation ID from any error messages
- Your region setting
- The specific error message displayed

## Development

### Project Structure

```
/app
  server.js                # Express server
  /public
    index.html             # Main web interface
    app.js                 # Frontend JavaScript
    styles.css             # Styling
insightAccount-api-v1.json # OpenAPI specification
package.json               # Node.js dependencies
README.md                  # This file
```

### API Specification

All endpoint details, authentication schemes, and response formats are defined in `insightAccount-api-v1.json`. The server reads this file at startup to configure authentication headers and validate the API structure.

## License

MIT License
