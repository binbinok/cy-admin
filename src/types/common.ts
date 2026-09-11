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
  CREATE_MEMBER = 'create_member',
  UPDATE_MEMBER = 'update_member',
  CREATE_MEMBER_CARD = 'create_member_card',
  CANCEL_MEMBER_CARD = 'cancel_member_card',
  RECHARGE_CARD = 'recharge_card',
  UPGRADE_CARD_LEVEL = 'upgrade_card_level',
  UPDATE_CARD_LEVEL = 'update_card_level',
  ISSUE_SESSION_CARD = 'issue_session_card',
  REFUND_SESSION_CARD = 'refund_session_card',
  CREATE_SESSION_CARD_TYPE = 'create_session_card_type',
  UPDATE_SESSION_CARD_TYPE = 'update_session_card_type',
  TOGGLE_SESSION_CARD_TYPE = 'toggle_session_card_type',
  CREATE_SERVICE_TEMPLATE = 'create_service_template',
  UPDATE_SERVICE_TEMPLATE = 'update_service_template',
  TOGGLE_SERVICE_TEMPLATE_STATUS = 'toggle_service_template_status',
  CREATE_APPOINTMENT = 'create_appointment',
  COMPLETE_SERVICE = 'complete_service',
  CREATE_SETTLEMENT = 'create_settlement',
  CREATE_INCOME_RECORD = 'create_income_record',
  UPDATE_COMMISSION_RATE = 'update_commission_rate',
  DELETE_TECHNICIAN = 'delete_technician',
  CREATE_ADMIN = 'create_admin',
  DISABLE_ADMIN = 'disable_admin',
  ENABLE_ADMIN = 'enable_admin',
  BIRTHDAY_NOTIFICATION = 'birthday_notification',
}

export interface OperationLog {
  _id: string;
  adminId: string;
  adminName: string;
  action: OperationAction;
  targetType: string;
  targetId: string;
  targetName?: string;
  detail: string;
  ipAddress: string;
  createdAt: Date;
}
