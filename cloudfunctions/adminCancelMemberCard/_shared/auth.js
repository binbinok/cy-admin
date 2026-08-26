'use strict';

const jwt = require('jsonwebtoken');
const { AdminError, AdminErrorCode } = require('./errors');

/**
 * 从 event 中提取并验证 JWT Token，返回解码后的管理员信息。
 *
 * Token 提取优先级：event.authorization > event.token > event.__token
 *
 * @param {object} event - 云函数 event 对象
 * @returns {{ adminId: string, role: string }} 解码后的 adminInfo
 * @throws {AdminError} code=UNAUTHORIZED 当 token 缺失或验证失败时
 */
function verifyAuth(event) {
  const token =
    event.authorization ||
    event.token ||
    event.__token;

  if (!token) {
    throw new AdminError(
      AdminErrorCode.UNAUTHORIZED,
      '未授权'
    );
  }

  // 去除可能的 "Bearer " 前缀
  const rawToken = token.startsWith('Bearer ')
    ? token.slice(7)
    : token;

  try {
    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    return { adminId: decoded.adminId, role: decoded.role };
  } catch {
    throw new AdminError(
      AdminErrorCode.UNAUTHORIZED,
      '登录已过期，请重新登录'
    );
  }
}

module.exports = {
  verifyAuth,
};
