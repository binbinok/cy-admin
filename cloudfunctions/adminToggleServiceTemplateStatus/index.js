'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 启用 / 停用服务模板
 *
 * 入参：{ templateId, active }
 * 模板停用后新预约不可选择该服务大类，已有预约保持有效。
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const templateId = String(event.templateId || '').trim();
    const active = event.active === true || event.active === 'true';
    if (!templateId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '模板 ID 不能为空');
    }

    const { data: template } = await db.collection('service_templates').doc(templateId).get();
    if (!template) {
      return error(AdminErrorCode.NOT_FOUND, '服务模板不存在');
    }

    const now = new Date();
    await db.collection('service_templates').doc(templateId).update({
      data: { active, updatedAt: now },
    });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'toggle_service_template_status',
        targetType: 'service_template',
        targetId: templateId,
        detail: `${active ? '启用' : '停用'}服务模板，分类 ${template.categoryName || template.categoryId}`,
        createdAt: now,
      },
    });

    return success({ templateId, active, message: active ? '模板已启用' : '模板已停用' });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminToggleServiceTemplateStatus error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '模板状态更新失败，请稍后重试');
  }
};
