// Global state
let currentUsers = [];

// DOM elements
const form = document.getElementById('userForm');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorContent = document.getElementById('errorContent');
const resultsDiv = document.getElementById('results');
const usersTableBody = document.getElementById('usersTableBody');
const userCountSpan = document.getElementById('userCount');
const exportButton = document.getElementById('exportCsv');
const emptyState = document.getElementById('emptyState');
const filterBadge = document.getElementById('filterBadge');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const chipsContainer = document.getElementById('chipsContainer');
const clearFiltersBtn = document.getElementById('clearFilters');

// Utility functions
function showElement(element) {
  element.classList.remove('hidden');
}

function hideElement(element) {
  element.classList.add('hidden');
}

function showLoading() {
  hideElement(errorDiv);
  hideElement(resultsDiv);
  showElement(loadingDiv);
}

function hideLoading() {
  hideElement(loadingDiv);
}

function showError(message, details = null) {
  hideLoading();
  hideElement(resultsDiv);
  
  let content = `<p>${message}</p>`;
  if (details) {
    if (details.code) content += `<p><strong>Code:</strong> ${details.code}</p>`;
    if (details.message) content += `<p><strong>Message:</strong> ${details.message}</p>`;
    if (details.correlation_id) content += `<p><strong>Correlation ID:</strong> ${details.correlation_id}</p>`;
  }
  
  errorContent.innerHTML = content;
  showElement(errorDiv);
}

function showResults(users) {
  hideLoading();
  hideElement(errorDiv);
  
  currentUsers = users;
  userCountSpan.textContent = `(${users.length} users)`;
  
  if (users.length === 0) {
    hideElement(document.getElementById('tableContainer'));
    showElement(emptyState);
    exportButton.disabled = true;
  } else {
    hideElement(emptyState);
    showElement(document.getElementById('tableContainer'));
    renderTable(users);
    exportButton.disabled = false;
  }
  
  showElement(resultsDiv);
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function renderTable(users) {
  usersTableBody.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(user.id || '')}</td>
      <td>${escapeHtml(user.email || '')}</td>
      <td>${escapeHtml(user.first_name || '')}</td>
      <td>${escapeHtml(user.last_name || '')}</td>
      <td><span class="status status-${(user.status || '').toLowerCase()}">${escapeHtml(user.status || '')}</span></td>
  <td>${user.platform_admin ? 'Yes' : 'No'}</td>
    `;
    usersTableBody.appendChild(row);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(users) {
  const headers = ['id', 'email', 'first_name', 'last_name', 'status', 'platform_admin'];
  const csvContent = [];
  
  // Add BOM for Excel compatibility
  csvContent.push('\ufeff');
  
  // Add header row
  csvContent.push(headers.join(','));
  
  // Add data rows
  users.forEach(user => {
    const row = [
      escapeCsv(user.id),
      escapeCsv(user.email),
      escapeCsv(user.first_name),
      escapeCsv(user.last_name),
      escapeCsv(user.status),
      escapeCsv(user.platform_admin ? 'Yes' : 'No')
    ];
    csvContent.push(row.join(','));
  });
  
  return csvContent.join('\n');
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Form submission handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  showLoading();
  
  const formData = new FormData(form);
  const filters = {};
  
  // Build filters object
  if (formData.get('status')) filters.status = formData.get('status');
  const platform = formData.get('platformAdmin');
  if (platform === 'yes') filters['platform-admin'] = true;
  if (platform === 'no') filters['platform-admin'] = false;
  if (formData.get('email')) filters.email = formData.get('email');
  if (formData.get('firstName')) filters.first_name = formData.get('firstName');
  if (formData.get('lastName')) filters.last_name = formData.get('lastName');
  
  const requestBody = {
    region: formData.get('region'),
    apiKey: formData.get('apiKey'),
    filters
  };
  
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
  const data = await response.json();
    
    if (!response.ok) {
      showError(
        data.error || 'Request failed',
        data.details
      );
      return;
    }
    
  const arr = Array.isArray(data) ? data : (data.users || []);
  showResults(arr);
    
  } catch (error) {
    showError('Network error: ' + error.message);
  }
});

// CSV export handler
exportButton.addEventListener('click', () => {
  if (currentUsers.length === 0) {
    alert('No data to export');
    return;
  }
  
  const csv = generateCsv(currentUsers);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `rapid7-users-${timestamp}.csv`;
  
  downloadCsv(csv, filename);
});

  // Show/Hide API key
  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', () => {
      const apiKeyInput = document.getElementById('apiKey');
      const isPassword = apiKeyInput.type === 'password';
      apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleApiKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
  toggleApiKeyBtn.setAttribute('aria-pressed', String(isPassword));
  toggleApiKeyBtn.setAttribute('aria-label', isPassword ? 'Hide API Key' : 'Show API Key');
    });
  }

  // Live filter badge & summary
  function updateFiltersUI() {
    const status = document.getElementById('status')?.value || '';
    const platform = (new FormData(form).get('platformAdmin')) || 'any';
    const email = (document.getElementById('email')?.value || '').trim();
    const firstName = (document.getElementById('firstName')?.value || '').trim();
    const lastName = (document.getElementById('lastName')?.value || '').trim();
    const active = [];
    if (status) active.push({ key: 'status', label: `Status: ${status}` });
    if (platform === 'yes') active.push({ key: 'platform-admin', label: 'Platform Admin: Yes' });
    if (platform === 'no') active.push({ key: 'platform-admin', label: 'Platform Admin: No' });
    if (email) active.push({ key: 'email', label: `Email: ${email}` });
    if (firstName) active.push({ key: 'first_name', label: `First Name: ${firstName}` });
    if (lastName) active.push({ key: 'last_name', label: `Last Name: ${lastName}` });
    if (filterBadge) filterBadge.textContent = String(active.length);
  if (clearFiltersBtn) clearFiltersBtn.disabled = active.length === 0;
    // Render chips
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      active.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = item.label + ' ';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'remove';
        btn.setAttribute('aria-label', `Remove ${item.label}`);
        btn.textContent = '×';
        btn.addEventListener('click', () => removeFilter(item.key));
        chip.appendChild(btn);
        chipsContainer.appendChild(chip);
      });
    }
    persistFilters();
  }

  ['status','platformAdmin','email','firstName','lastName'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, updateFiltersUI);
  });

  // Remove individual filter via chip
  function removeFilter(key) {
  switch (key) {
      case 'status':
        document.getElementById('status').value = '';
        break;
      case 'platform-admin':
    document.getElementById('platformAdmin').value = '';
        break;
      case 'email':
        document.getElementById('email').value = '';
        break;
      case 'first_name':
        document.getElementById('firstName').value = '';
        break;
      case 'last_name':
        document.getElementById('lastName').value = '';
        break;
    }
    updateFiltersUI();
  }

  // Clear all filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      document.getElementById('status').value = '';
      document.getElementById('platformAdmin').value = '';
      document.getElementById('email').value = '';
      document.getElementById('firstName').value = '';
      document.getElementById('lastName').value = '';
      updateFiltersUI();
      // trigger fetch with no filters
      form.requestSubmit();
    });
  }

  // Basic email validation on input
  const emailInput = document.getElementById('email');
  const emailHelp = document.getElementById('emailHelp');
  if (emailInput) {
    const validateEmail = () => {
      const isInvalid = emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
      if (isInvalid) {
        emailInput.classList.add('error-input');
        if (emailHelp) emailHelp.classList.remove('hidden');
      } else {
        emailInput.classList.remove('error-input');
        if (emailHelp) emailHelp.classList.add('hidden');
      }
      emailInput.setCustomValidity(isInvalid ? 'Invalid email' : '');
    };
    emailInput.addEventListener('input', validateEmail);
    emailInput.addEventListener('blur', validateEmail);
  }

  // Persist and restore filters
  const STORAGE_KEY = 'r7_filters_v1';
  function persistFilters() {
    const data = {
      status: document.getElementById('status')?.value || '',
      platformAdmin: (new FormData(form).get('platformAdmin')) || 'any',
      email: document.getElementById('email')?.value || '',
      firstName: document.getElementById('firstName')?.value || '',
      lastName: document.getElementById('lastName')?.value || ''
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function restoreFilters() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      document.getElementById('status').value = data.status || '';
  const platform = data.platformAdmin || '';
  document.getElementById('platformAdmin').value = platform;
      document.getElementById('email').value = data.email || '';
      document.getElementById('firstName').value = data.firstName || '';
      document.getElementById('lastName').value = data.lastName || '';
    } catch {}
  }

  restoreFilters();
  updateFiltersUI();
