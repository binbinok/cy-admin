export interface Technician {
  _id: string;
  name: string;
  avatarUrl?: string;
  specialties: string[];
  status: 'idle' | 'busy' | 'rest';
  schedule: Record<string, { startTime: string; endTime: string }[]>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicianServiceSlot {
  _id: string;
  technicianId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  serviceIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicianCommissionConfig {
  _id: string;
  technicianId: string;
  commissionRate: number; // 1-100, default 30
  updatedBy: string;
  updatedAt: Date;
}
