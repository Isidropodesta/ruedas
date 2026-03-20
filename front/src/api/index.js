const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

// Vehicles
export function getVehicles(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, v);
  });
  const qs = params.toString();
  return request(`/vehicles${qs ? '?' + qs : ''}`);
}

export function getVehicle(id) {
  return request(`/vehicles/${id}`);
}

export function createVehicle(formData) {
  return request('/vehicles', {
    method: 'POST',
    body: formData,
  });
}

export function updateVehicle(id, data) {
  return request(`/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateVehicleStatus(id, data) {
  return request(`/vehicles/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteVehicle(id) {
  return request(`/vehicles/${id}`, { method: 'DELETE' });
}

// Component Report
export function getVehicleReport(id) {
  return request(`/vehicles/${id}/report`);
}

export function saveVehicleReport(id, data) {
  return request(`/vehicles/${id}/report`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Test Drives
export function getVehicleTestDrives(id) {
  return request(`/vehicles/${id}/test-drives`);
}

export function createTestDrive(vehicleId, data) {
  return request(`/vehicles/${vehicleId}/test-drives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function getAllTestDrives(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, v);
  });
  const qs = params.toString();
  return request(`/test-drives${qs ? '?' + qs : ''}`);
}

export function updateTestDrive(id, data) {
  return request(`/test-drives/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteTestDrive(id) {
  return request(`/test-drives/${id}`, { method: 'DELETE' });
}

export function getPublicVehicle(id) {
  const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
  return fetch(`${base}/public/vehicles/${id}`).then(r => r.json());
}

// Sellers
export function getSellers() {
  return request('/sellers');
}

export function getSeller(id) {
  return request(`/sellers/${id}`);
}

export function createSeller(data) {
  return request('/sellers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateSeller(id, data) {
  return request(`/sellers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function toggleSeller(id) {
  return request(`/sellers/${id}/toggle`, { method: 'PUT' });
}

// KPIs
export function getGeneralKpis() {
  return request('/kpis/general');
}

export function getSellerKpis({ period, seller_id } = {}) {
  const params = new URLSearchParams();
  if (period && period !== 'all') params.append('period', period);
  if (seller_id) params.append('seller_id', seller_id);
  const qs = params.toString();
  return request(`/kpis/sellers${qs ? '?' + qs : ''}`);
}

export function getMonthlyKpis(period) {
  return request(`/kpis/monthly${period && period !== '1y' ? '?period=' + period : ''}`);
}

export function getAdvancedKpis() {
  return request('/kpis/advanced');
}

// Vehicle price history
export function getVehiclePriceHistory(id) {
  return request('/vehicles/' + id + '/price-history');
}

// My test drives (authenticated)
export function getMyTestDrives() {
  return request('/test-drives/mine');
}

export function cancelMyTestDrive(id) {
  return request(`/test-drives/${id}/cancel`, { method: 'PUT' });
}

// Auth
export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function register(name, email, password) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
}

// Users (dueño only)
export function getUsers() {
  return request('/users');
}

export function createUser(data) {
  return request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateUser(id, data) {
  return request(`/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

// Vehicle stats
export function getVehicleStats(id) {
  return request(`/vehicles/${id}/stats`);
}

// Bulk status change
export function bulkUpdateVehicleStatus(ids, status) {
  return request('/vehicles/bulk-status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status }),
  });
}

// CSV import
export function importVehiclesCSV(formData) {
  return request('/vehicles/import-csv', { method: 'POST', body: formData });
}

// Profile
export function updateProfile(data) {
  return request('/auth/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Password reset
export function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, password) {
  return request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
}

// Notifications
export function getNotifications() {
  return request('/notifications');
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PUT' });
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PUT' });
}

// Company
export function getMyCompany() {
  return request('/companies/me');
}

// App config
export function getAppConfig() {
  const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
  return fetch(`${base}/config`).then(r => r.json());
}

export function updateAppConfig(data) {
  return request('/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
