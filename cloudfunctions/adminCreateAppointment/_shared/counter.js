'use strict';

const { db, _ } = require('./db');

/**
 * 当前北京时间日期键（YYYYMMDD）。云函数运行在 UTC，
 * 直接取服务器年月日会在北京时间 0-8 点偏移一天，因此显式加 8 小时。
 * @returns {string}
 */
function beijingDateKey() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * 确保计数器文档存在：update 未命中说明文档缺失，用 add 占位（seq=0）；
 * 并发下 add 撞 _id 的冲突说明已被其他请求占位，可安全忽略。
 * @param {string} key
 * @returns {Promise<void>}
 */
async function ensureCounter(key) {
  const docRef = db.collection('counters').doc(key);
  const res = await docRef.update({ data: { updatedAt: new Date() } });
  if (res.stats && res.stats.updated === 1) {
    return;
  }
  try {
    await db.collection('counters').add({
      data: { _id: key, seq: 0, createdAt: new Date(), updatedAt: new Date() },
    });
  } catch (err) {
    // 占位冲突 = 文档已存在，继续取号
  }
}

/**
 * 事务内自增：读、改、写在同一事务完成，保证并发取号不重复。
 * @param {string} key
 * @returns {Promise<number>}
 */
function nextSeqInTx(key) {
  return db.runTransaction(async (transaction) => {
    const docRef = transaction.collection('counters').doc(key);
    const { data } = await docRef.get();
    const next = Number((data && data.seq) || 0) + 1;
    await docRef.update({ data: { seq: next, updatedAt: new Date() } });
    return next;
  });
}

/**
 * 回退方案：原子 inc 后读回，依赖单店低并发场景。
 * @param {string} key
 * @returns {Promise<number>}
 */
async function nextSeqFallback(key) {
  const docRef = db.collection('counters').doc(key);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await docRef.update({ data: { seq: _.inc(1), updatedAt: new Date() } });
    if (res.stats && res.stats.updated === 1) {
      const { data } = await docRef.get();
      return Number(data.seq);
    }
    await ensureCounter(key);
  }
  throw new Error(`计数器 ${key} 不可用`);
}

/**
 * 取指定计数器的下一个序号
 * @param {string} key 计数器键，如 appointment_20260914 / member
 * @returns {Promise<number>}
 */
async function nextSeq(key) {
  await ensureCounter(key);
  try {
    const seq = await nextSeqInTx(key);
    if (Number.isInteger(seq) && seq > 0) {
      return seq;
    }
  } catch (err) {
    // 事务不可用或冲突时回退到 inc + 读回
  }
  return nextSeqFallback(key);
}

/**
 * 序号转编号：不足 minWidth 左侧补零，超出宽度自然进位
 * @param {number} seq
 * @param {number} [minWidth=3]
 * @returns {string}
 */
function formatSeq(seq, minWidth = 3) {
  return String(seq).padStart(minWidth, '0');
}

module.exports = { beijingDateKey, nextSeq, formatSeq };
