'use strict';

/**
 * 将 operation_logs 原始文档映射为前端 LoginLog 契约
 * @param {{ _id?: string, adminId?: string, adminName?: string, createdAt?: Date|string, ipAddress?: string, detail?: string }} log
 * @returns {{ _id?: string, adminId?: string, username?: string, loginTime?: Date|string, ipAddress: string, result: 'success'|'failed', failReason?: string }}
 */
function mapLoginLog(log) {
  const detail = String(log.detail || '');
  const failed = detail.includes('失败');
  return {
    _id: log._id,
    adminId: log.adminId,
    username: log.adminName,
    loginTime: log.createdAt,
    ipAddress: log.ipAddress || '',
    result: failed ? 'failed' : 'success',
    failReason: failed ? detail : undefined,
  };
}

module.exports = { mapLoginLog };
