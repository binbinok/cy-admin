export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export enum OperationAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  UPDATE_MEMBER = 'update_member',
  COMPLETE_SERVICE = 'complete_service',
  UPDATE_COMMISSION_RATE = 'update_commission_rate',
  RECHARGE_CARD = 'recharge_card',
  CREATE_ADMIN = 'create_admin',
  DISABLE_ADMIN = 'disable_admin',
  DELETE_TECHNICIAN = 'delete_technician',
}

export interface OperationLog {
  _id: string;
  adminId: string;
  adminName: string;
  action: OperationAction;
  targetType: string;
  targetId: string;
  detail: string;
  ipAddress: string;
  createdAt: Date;
}
