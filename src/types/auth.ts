export interface AdminAccount {
  _id: string;
  adminId: string;
  username: string;
  passwordHash: string;
  role: 'super_admin' | 'admin';
  status: 'active' | 'disabled';
  failCount: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  adminInfo: {
    adminId: string;
    username: string;
    role: 'super_admin' | 'admin';
  };
}

export interface LoginLog {
  _id: string;
  adminId: string;
  username: string;
  loginTime: Date;
  ipAddress: string;
  result: 'success' | 'failed';
  failReason?: string;
}
