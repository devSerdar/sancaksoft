import axios from 'axios';

const api = axios.create({
 baseURL: "/api/v1",
  headers: {
    'Content-Type': 'application/json',
    // Stub Tenant ID for MVP (In real app, this comes from Auth/Login)
    'X-Tenant-ID': '00000000-0000-0000-0000-000000000001',
    'X-User-ID': '00000000-0000-0000-0000-000000000002',
  },
});

export default api;
