const ACTION_LABELS: Record<string, string> = {
  login: '登录',
  logout: '登出',
  create_member: '创建会员',
  update_member: '修改会员',
  create_member_card: '开通会员卡',
  cancel_member_card: '注销会员卡',
  recharge_card: '会员卡充值',
  upgrade_card_level: '会员卡升级',
  update_card_level: '调整卡等级',
  issue_session_card: '售出次卡',
  refund_session_card: '退次卡',
  create_session_card_type: '创建次卡卡种',
  update_session_card_type: '编辑次卡卡种',
  toggle_session_card_type: '启停次卡卡种',
  create_service_template: '创建服务模板',
  update_service_template: '更新服务模板',
  toggle_service_template_status: '启停服务模板',
  create_appointment: '创建预约',
  complete_service: '完成服务',
  create_settlement: '结算录入',
  create_income_record: '收入录入',
  update_commission_rate: '修改提成比例',
  delete_technician: '删除技师',
  create_admin: '创建管理员',
  disable_admin: '禁用管理员',
  enable_admin: '启用管理员',
  birthday_notification: '生日祝福',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  session: '登录会话',
  member: '会员',
  member_card: '会员卡',
  member_session_card: '次卡',
  session_card_type: '次卡卡种',
  service_template: '服务模板',
  appointment: '预约',
  consumption_record: '消费记录',
  technician: '技师',
  technician_commission_config: '提成配置',
  admin: '管理员',
};

const operationLogLabels = {
  action: ACTION_LABELS,
  targetType: TARGET_TYPE_LABELS,
  formatAction: (action: string): string => ACTION_LABELS[action] ?? action,
  formatTargetType: (targetType: string): string =>
    TARGET_TYPE_LABELS[targetType] ?? targetType,
};

export default operationLogLabels;
