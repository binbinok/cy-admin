export interface Appointment {
  _id: string;
  appointmentId: string;
  memberId: string;
  memberName?: string;
  memberPhone?: string;
  guestName?: string;
  guestPhone?: string;
  serviceId?: string; // 历史数据字段，新预约不再写入
  serviceName?: string; // 历史数据快照，新预约不再写入
  categoryId?: string; // 服务大类（新预约）
  categoryName?: string; // 服务大类名称快照
  duration?: number; // 占用时长（分钟）
  technicianId: string;
  technicianName?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  status: 'pending' | 'in_service' | 'completed' | 'cancelled';
  actualAmount?: number; // 分
  remark?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
