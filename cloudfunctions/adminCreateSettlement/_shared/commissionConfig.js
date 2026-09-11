'use strict';

const { db } = require('./db');

const DEFAULT_MANUAL_COMMISSION_RATE = 20;
const DEFAULT_CARD_OPEN_COMMISSION_RATE = 10;
const DEFAULT_CARD_RENEW_COMMISSION_RATE = 5;

function toValidRate(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : fallback;
}

async function getGlobalCommissionConfig() {
  let doc = {};
  try {
    const { data: list } = await db.collection('commission_config').limit(1).get();
    doc = (list && list[0]) || {};
  } catch (_e) {
    doc = {};
  }
  return {
    manualRate: toValidRate(doc.manualRate, DEFAULT_MANUAL_COMMISSION_RATE),
    cardOpenRate: toValidRate(doc.cardOpenRate, DEFAULT_CARD_OPEN_COMMISSION_RATE),
    cardRenewRate: toValidRate(doc.cardRenewRate, DEFAULT_CARD_RENEW_COMMISSION_RATE),
  };
}

async function ensureCommissionConfigCollection() {
  try {
    await db.createCollection('commission_config');
  } catch (_e) {
  }
}

async function getTechnicianName(technicianId) {
  try {
    const { data: doc } = await db.collection('technicians').doc(technicianId).get();
    return (doc && doc.name) || '';
  } catch (_e) {
    return '';
  }
}

async function addCardCommissionRecord({ type, technicianId, serviceAmount, commissionRate, cardId, memberId, createdAt }) {
  const technicianName = await getTechnicianName(technicianId);
  const commissionAmount = Math.floor((serviceAmount * commissionRate) / 100);
  await db.collection('commission_records').add({
    data: {
      type,
      technicianId,
      technicianName,
      appointmentId: '',
      consumptionId: '',
      cardId: cardId || '',
      memberId: memberId || '',
      serviceAmount,
      commissionRate,
      commissionAmount,
      createdAt,
    },
  });
  return { commissionAmount, technicianName };
}

module.exports = {
  getGlobalCommissionConfig,
  ensureCommissionConfigCollection,
  addCardCommissionRecord,
  DEFAULT_MANUAL_COMMISSION_RATE,
  DEFAULT_CARD_OPEN_COMMISSION_RATE,
  DEFAULT_CARD_RENEW_COMMISSION_RATE,
};
