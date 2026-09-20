// frontend/src/api/dashboard.api.ts
import type { DashboardDataDto } from '../types/dashboard.types';

const BASE_URL = 'http://localhost:4000/api/dashboard';

export async function getDashboardData(mes?: string): Promise<DashboardDataDto> {
  const url = mes ? `${BASE_URL}?mes=${encodeURIComponent(mes)}` : BASE_URL;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al obtener los datos del dashboard');
  }
  return res.json();
}
