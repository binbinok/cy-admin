'use strict';

/**
 * 构造成功响应
 * @param {*} data - 响应数据
 * @returns {{ success: true, data: * }}
 */
function success(data) {
  return { success: true, data: data !== undefined ? data : {} };
}

/**
 * 构造失败响应
 * @param {string} code - 错误码
 * @param {string} message - 错误描述
 * @returns {{ success: false, error: { code: string, message: string } }}
 */
function error(code, message) {
  return { success: false, error: { code, message } };
}

module.exports = {
  success,
  error,
};
