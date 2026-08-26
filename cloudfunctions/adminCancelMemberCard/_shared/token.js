const crypto = require('crypto');

function createAdminToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHash('sha256').update(encoded).digest('hex').slice(0, 24);
  return `${encoded}.${signature}`;
}

function parseAdminToken(token) {
  const encoded = String(token || '').split('.')[0] || '';
  if (!encoded) {
    return null;
  }
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

module.exports = {
  createAdminToken,
  parseAdminToken,
};
