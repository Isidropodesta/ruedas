const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) {
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

export function getSellerKpis() {
  return request('/kpis/sellers');
}

export function getMonthlyKpis() {
  return request('/kpis/monthly');
}
