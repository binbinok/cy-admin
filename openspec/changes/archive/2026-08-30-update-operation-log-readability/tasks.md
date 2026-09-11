# 实施清单

## 1. 云函数日志写入改造（targetName + 详情去 ID）

- [x] 1.1 adminLogin / adminLogout（session → 用户名）
- [x] 1.2 adminCreateAppointment（appointment → 客户姓名）
- [x] 1.3 adminCreateIncomeRecord（consumption_record → 会员/散客姓名）
- [x] 1.4 adminCompleteService + adminCreateSettlement + 根级 _shared/settlement.js（consumption_record → 会员姓名）
- [x] 1.5 adminCreateMember / adminUpdateMember / adminSendBirthdayNotification（member → 会员姓名）
- [x] 1.6 adminCreateMemberCard / adminCancelMemberCard / adminRechargeCard / adminUpdateCardLevel（member_card → 折扣等级名）
- [x] 1.7 adminIssueSessionCard / adminRefundSessionCard（member_session_card → 次卡卡种名）
- [x] 1.8 adminCreateSessionCardType / adminUpdateSessionCardType / adminToggleSessionCardType（session_card_type → 卡种名）
- [x] 1.9 adminCreateServiceTemplate / adminUpdateServiceTemplate / adminToggleServiceTemplateStatus（service_template → 模板名）
- [x] 1.10 adminUpdateCommissionRate（technician_commission_config → 技师姓名）/ adminDeleteTechnician（technician → 技师姓名）
- [x] 1.11 createAdmin / updateAdminStatus（admin → 用户名）

## 2. 前端改造

- [x] 2.1 `src/types/common.ts`：OperationLog 增加 `targetName?: string`，OperationAction 枚举补全
- [x] 2.2 操作类型（25 项）与操作对象（11 项）中文映射
- [x] 2.3 OperationLogPage：列渲染中文映射；「对象ID」列改为「操作对象」展示 targetName（空值显示 `-`）；删除「IP地址」列；筛选下拉补全

## 3. 验证与部署

- [x] 3.1 `tsc --noEmit` + `eslint` 通过
- [x] 3.2 `vitest --run` 全部通过（补充映射工具测试）
- [x] 3.3 部署全部改动的云函数
- [x] 3.4 `openspec validate update-operation-log-readability --strict` 通过
