// frontend/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
};

// ─── GOALS ──────────────────────────────────────────────────────────────────
export const goalsApi = {
  getMySheet:   (cycleId: string) => api.get(`/goals/my-sheet/${cycleId}`).then(r => r.data),
  addGoal:      (data: any)        => api.post('/goals/add-goal', data).then(r => r.data),
  updateGoal:   (id: string, data: any) => api.put(`/goals/goal/${id}`, data).then(r => r.data),
  deleteGoal:   (id: string)       => api.delete(`/goals/goal/${id}`).then(r => r.data),
  submitSheet:  (sheetId: string)  => api.post(`/goals/submit/${sheetId}`).then(r => r.data),
  validateSheet:(sheetId: string)  => api.get(`/goals/validate/${sheetId}`).then(r => r.data),

  // Manager
  getTeamSheets:(cycleId: string)  => api.get(`/goals/team/${cycleId}`).then(r => r.data),
  approveSheet: (sheetId: string)  => api.post(`/goals/approve/${sheetId}`).then(r => r.data),
  returnSheet:  (sheetId: string, reason: string) =>
    api.post(`/goals/return/${sheetId}`, { reason }).then(r => r.data),
  managerEditGoal: (goalId: string, data: any) =>
    api.put(`/goals/manager/goal/${goalId}`, data).then(r => r.data),

  // Admin
  unlockSheet:  (sheetId: string)  => api.post(`/goals/admin/unlock/${sheetId}`).then(r => r.data),
};

// ─── CHECK-INS ──────────────────────────────────────────────────────────────
export const checkinsApi = {
  logAchievement: (data: any)      => api.post('/checkins/log', data).then(r => r.data),
  getTeamCheckins:(cycleId: string, quarter: string) =>
    api.get(`/checkins/team/${cycleId}/${quarter}`).then(r => r.data),
  addComment:     (checkInId: string, comment: string) =>
    api.post('/checkins/comment', { checkInId, comment }).then(r => r.data),
  getMyCheckins:  (cycleId: string) => api.get(`/checkins/my/${cycleId}`).then(r => r.data),
  getScore:       (sheetId: string, quarter: string) =>
    api.get(`/checkins/score/${sheetId}/${quarter}`).then(r => r.data),
};

// ─── REPORTS ────────────────────────────────────────────────────────────────
export const reportsApi = {
  downloadAchievement: (cycleId: string) =>
    api.get(`/reports/achievement/${cycleId}`, { responseType: 'blob' }).then(r => r.data),
  getCompletion: (cycleId: string) =>
    api.get(`/reports/completion/${cycleId}`).then(r => r.data),
  getAuditLog:   (cycleId: string) =>
    api.get(`/reports/audit/${cycleId}`).then(r => r.data),
};

export default api;
