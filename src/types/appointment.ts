export interface Appointment {
  _id: string;
  appointmentId: string;
  memberId: string;
  guestName?: string;
  guestPhone?: string;
  serviceId: string;
  technicianId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  status: 'pending' | 'in_service' | 'completed' | 'cancelled';
  actualAmount?: number; // 分
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}
