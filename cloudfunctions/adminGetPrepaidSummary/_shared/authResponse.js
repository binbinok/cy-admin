function createAuthFailedResponse() {
  return {
    code: 'AUTH_FAILED',
    message: '用户名或密码错误',
  };
}

module.exports = {
  createAuthFailedResponse,
};
