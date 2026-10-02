import axios from 'axios';
import { User, Vehicle, SapOrder, LoadAssembly, CapacityOccupancy, SapStatus, AuditLog, Branch, SystemSettings } from '../types';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('montagem_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar expiração de sessão (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('montagem_token');
      localStorage.removeItem('montagem_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: User; mustChangePassword?: boolean } }>('/auth/login', {
      email,
      password,
    });
    return res.data;
  },
  me: async () => {
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.post<{ success: boolean; message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post<{ success: boolean; message: string; data?: { simulatedCode?: string; sent?: boolean } }>('/auth/forgot-password', {
      email,
    });
    return res.data;
  },
  resetPasswordWithCode: async (email: string, code: string, newPassword: string) => {
    const res = await api.post<{ success: boolean; message: string }>('/auth/reset-password', {
      email,
      code,
      newPassword,
    });
    return res.data;
  },
};

export const userService = {
  list: async () => {
    const res = await api.get<{ success: boolean; data: User[] }>('/users');
    return res.data.data;
  },
  create: async (data: { name: string; email: string; password: string; role: string }) => {
    const res = await api.post<{ success: boolean; message: string; data: User }>('/users', data);
    return res.data;
  },
  update: async (id: string, data: { name: string; email: string; role: string; password?: string; is_active?: number }) => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/users/${id}`, data);
    return res.data;
  },
  toggleStatus: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string; data: { id: string; is_active: number } }>(`/users/${id}/toggle-status`);
    return res.data;
  },
  resetPassword: async (id: string, newPassword: string) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      newPassword,
    });
    return res.data;
  },
};

export const branchService = {
  list: async () => {
    const res = await api.get<{ success: boolean; data: Branch[] }>('/branches');
    return res.data.data;
  },
  getById: async (id: number | string) => {
    const res = await api.get<{ success: boolean; data: Branch }>(`/branches/${id}`);
    return res.data.data;
  },
  update: async (id: number | string, data: Partial<Branch>) => {
    const res = await api.put<{ success: boolean; message: string; data: Branch }>(`/branches/${id}`, data);
    return res.data;
  },
  adjustDocNumber: async (id: number | string, action: 'increment' | 'decrement' | 'set', value?: number) => {
    const res = await api.post<{ success: boolean; message: string; data: { id: number; current_doc_number: number } }>(`/branches/${id}/doc-number`, {
      action,
      value,
    });
    return res.data;
  },
  toggleStatus: async (id: number | string) => {
    const res = await api.patch<{ success: boolean; message: string; data: { id: number; is_active: number } }>(`/branches/${id}/toggle-status`);
    return res.data;
  },
  syncFromSap: async () => {
    const res = await api.post<{ success: boolean; message: string; data: Branch[] }>('/branches/sync-sap');
    return res.data;
  },
  batchUpdate: async (branches: Branch[]) => {
    const res = await api.put<{ success: boolean; message: string; data: Branch[] }>('/branches/batch', { branches });
    return res.data;
  },
};

export const settingsService = {
  getSettings: async () => {
    const res = await api.get<{ success: boolean; data: SystemSettings }>('/settings');
    return res.data.data;
  },
  updateSettings: async (settings: Partial<SystemSettings>) => {
    const res = await api.put<{ success: boolean; message: string }>('/settings', { settings });
    return res.data;
  },
};

export const vehicleService = {
  list: async (status?: string) => {
    const res = await api.get<{ success: boolean; data: Vehicle[] }>('/vehicles', { params: { status } });
    return res.data.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: Vehicle }>(`/vehicles/${id}`);
    return res.data.data;
  },
  create: async (vehicleData: Partial<Vehicle>) => {
    const res = await api.post<{ success: boolean; message: string; data: Vehicle }>('/vehicles', vehicleData);
    return res.data;
  },
  update: async (id: string, vehicleData: Partial<Vehicle>) => {
    const res = await api.put<{ success: boolean; message: string; data: Vehicle }>(`/vehicles/${id}`, vehicleData);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/vehicles/${id}`);
    return res.data;
  },
};

export const sapService = {
  getOrders: async (params?: { city?: string; state?: string; search?: string; branchId?: number; startDate?: string; endDate?: string; salesPerson?: string }) => {
    const res = await api.get<{ success: boolean; count: number; data: SapOrder[] }>('/sap/orders', { params });
    return res.data.data;
  },
  getOrderDetails: async (docEntry: number) => {
    const res = await api.get<{ success: boolean; data: SapOrder }>(`/sap/orders/${docEntry}`);
    return res.data.data;
  },
  getStatus: async () => {
    const res = await api.get<{ success: boolean; data: SapStatus }>('/sap/status');
    return res.data.data;
  },
  toggleMock: async (enabled: boolean) => {
    const res = await api.post<{ success: boolean; message: string; data: SapStatus }>('/sap/toggle-mock', { enabled });
    return res.data.data;
  },
};

export const loadService = {
  calculate: async (vehicleId: string, docEntries: number[]) => {
    const res = await api.post<{ success: boolean; data: CapacityOccupancy }>('/loads/calculate', {
      vehicleId,
      docEntries,
    });
    return res.data.data;
  },
  autoOptimize: async (vehicleId: string, targetCity?: string) => {
    const res = await api.post<{ success: boolean; data: CapacityOccupancy }>('/loads/auto-optimize', {
      vehicleId,
      targetCity,
    });
    return res.data.data;
  },
  create: async (data: { vehicleId: string; docEntries: number[]; branchId?: number; docNumber?: number; observations?: string; orders?: any[] }) => {
    const res = await api.post<{ success: boolean; message: string; data: LoadAssembly }>('/loads', data);
    return res.data;
  },
  list: async () => {
    const res = await api.get<{ success: boolean; data: LoadAssembly[] }>('/loads');
    return res.data.data;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: LoadAssembly }>(`/loads/${id}`);
    return res.data.data;
  },
  finalize: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/loads/${id}/finalize`);
    return res.data;
  },
  removeOrderItem: async (loadId: string, itemId: string) => {
    const res = await api.delete<{ success: boolean; message: string; data: any }>(`/loads/${loadId}/items/${itemId}`);
    return res.data;
  },
  deleteLoad: async (loadId: string, justification: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/loads/${loadId}`, {
      data: { justification },
    });
    return res.data;
  },

  syncWithSap: async (id: string) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>(`/loads/${id}/sync-sap`);
    return res.data;
  },

  downloadPdfBlob: async (id: string, title?: string) => {
    const res = await api.get(`/loads/${id}/pdf`, {
      params: title ? { title } : undefined,
      responseType: 'blob',
    });
    return res.data;
  },

  getPdfUrl: (id: string, title?: string) => {
    const token = localStorage.getItem('montagem_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (title) params.set('title', title);
    const qs = params.toString();
    return `/api/loads/${id}/pdf${qs ? `?${qs}` : ''}`;
  },
};

export const auditService = {
  list: async (params?: { startDate?: string; endDate?: string; search?: string; action?: string }) => {
    const res = await api.get<{ success: boolean; count: number; total: number; data: AuditLog[] }>('/audit-logs', { params });
    return res.data.data;
  },

  exportCsv: async (params?: { startDate?: string; endDate?: string; search?: string; action?: string }) => {
    const res = await api.get('/audit-logs/export', {
      params,
      responseType: 'blob',
    });

    // Cria link de download no navegador
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const startStr = params?.startDate || 'inicio';
    const endStr = params?.endDate || 'fim';
    link.setAttribute('download', `Logs_Auditoria_${startStr}_a_${endStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

