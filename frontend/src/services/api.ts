import { cryptoStorage } from '../utils/cryptoStorage';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = cryptoStorage.getItem('attendance_token');
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      'Cannot connect to backend server. Please verify the FastAPI backend is running on http://127.0.0.1:8000.',
      0
    );
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      if (response.status === 504 || response.status === 502) {
        errorDetail = 'Backend server unavailable. Please make sure the FastAPI backend is running on http://127.0.0.1:8000.';
      }
    }
    throw new ApiError(errorDetail, response.status);
  }

  // Check if response is empty
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { username: string; password: string }) =>
      request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) =>
      request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: () => request<any>('/auth/me'),
    changePassword: (data: { old_password: string; new_password: string }) =>
      request<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },

  // Students
  students: {
    getAll: (params?: Record<string, any>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/students${q}`);
    },
    getById: (id: number) => request<any>(`/students/${id}`),
    create: (data: any) => request<any>('/students', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number, deleteBiometrics: boolean = true) =>
      request<any>(`/students/${id}?delete_biometrics=${deleteBiometrics}`, { method: 'DELETE' }),
  },

  // Teachers
  teachers: {
    getAll: () => request<any[]>('/teachers'),
    getById: (id: number) => request<any>(`/teachers/${id}`),
    create: (data: any) => request<any>('/teachers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/teachers/${id}`, { method: 'DELETE' }),
  },

  // Subjects
  subjects: {
    getAll: () => request<any[]>('/subjects'),
    getById: (id: number) => request<any>(`/subjects/${id}`),
    create: (data: any) => request<any>('/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/subjects/${id}`, { method: 'DELETE' }),
  },

  // Classes
  classes: {
    getAll: (params?: Record<string, any>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/classes${q}`);
    },
    getById: (id: number) => request<any>(`/classes/${id}`),
    create: (data: any) => request<any>('/classes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/classes/${id}`, { method: 'DELETE' }),
  },

  // Face Recognition & Registration
  face: {
    register: (data: { student_id: string; images: string[] }) =>
      request<{ success: boolean; message: string; samples_processed: number; face_registered: boolean }>(
        '/face/register',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    recognize: (data: { image: string; class_id: number; session_id?: number | null }) =>
      request<{
        matched: boolean;
        face_detected: boolean;
        student_id?: string | null;
        student_name?: string | null;
        confidence: number;
        status?: string | null;
        attendance_marked: boolean;
        message: string;
        bounding_box?: { x: number; y: number; width: number; height: number } | null;
      }>('/face/recognize', { method: 'POST', body: JSON.stringify(data) }),
    deleteBiometrics: (studentId: string) =>
      request<{ success: boolean; message: string }>(`/face/biometrics/${studentId}`, {
        method: 'DELETE',
      }),
    getLivenessChallenge: () => request<any>('/face/liveness-challenge'),
  },

  // Attendance
  attendance: {
    startSession: (classId: number) =>
      request<any>('/attendance/session/start', {
        method: 'POST',
        body: JSON.stringify({ class_id: classId }),
      }),
    endSession: (sessionId: number) =>
      request<any>(`/attendance/session/${sessionId}/end`, { method: 'POST' }),
    getActiveSession: (classId: number) =>
      request<any>(`/attendance/session/active?class_id=${classId}`),
    markManual: (data: {
      student_id: number | string;
      class_id: number;
      attendance_date?: string;
      status: string;
      session_id?: number | null;
    }) => request<any>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
    updateRecord: (recordId: number, status: string) =>
      request<any>(`/attendance/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    getAll: (params?: Record<string, any>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/attendance${q}`);
    },
    getStudentAttendance: (studentId: number) =>
      request<any>(`/attendance/student/${studentId}`),
  },

  // Reports & Analytics
  reports: {
    getAttendance: (params?: Record<string, any>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports/attendance${q}`);
    },
    downloadExport: async (format: 'csv' | 'excel', params: Record<string, any> = {}) => {
      const token = cryptoStorage.getItem('attendance_token');
      const allParams = { ...params, format };
      const q = '?' + new URLSearchParams(allParams).toString();
      
      const response = await fetch(`${API_BASE}/reports/export${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Export download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? `attendance_report_${Date.now()}.csv` : `attendance_report_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    getTeacherStats: () => request<any>('/reports/stats/teacher'),
    getStudentStats: () => request<any>('/reports/stats/student'),
    getAdminStats: () => request<any>('/reports/stats/admin'),
  },

  // Database Backup & Restore
  backup: {
    create: () => request<any>('/backup/create', { method: 'POST' }),
    list: () => request<any[]>('/backup/list'),
    restore: (filename: string) =>
      request<any>('/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      }),
  },

  // Settings
  settings: {
    get: () => request<any>('/settings'),
    update: (data: { face_match_threshold?: number; attendance_threshold?: number }) =>
      request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
