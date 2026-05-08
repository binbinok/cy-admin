# Change: 更新管理端会员、服务分类与财务录入能力

## Why
当前规范与实现在以下业务点存在不一致或能力缺口：技师列表仍显示头像字段、服务分类仍依赖前端枚举、财务缺少手工收入录入入口、会员与会员卡关联权益缺少明确规则、会员生日录入与会员关系功能的关联约束不完整。这些问题会导致管理流程割裂、数据口径不统一，影响财务统计和会员运营效果。

## What Changes
- 修改技师管理列表展示规则，移除头像字段，仅保留姓名、擅长项目、状态与排班概览
- 修改服务项目管理规则，服务分类由数据库配置驱动，前端通过接口拉取分类选项
- 新增“收入录入”能力，支持录入服务分类、技师、客户、服务时间、服务内容、服务费用、服务备注
- 收入录入时按服务与客户会员卡折扣规则计算费用明细（折扣金额、实付金额、积分奖励）并持久化
- 收入录入后同步更新会员积分与累计消费，并将消费记录与技师服务记录建立关联
- 将手工收入录入数据纳入财务统计口径，与预约完成收入统一展示
- 新增“会员关联会员卡”与“会员权益生效”规则，关联后消费自动应用折扣/积分奖励策略
- 新增会员生日录入与持久化规则，确保生日数据可被会员关系相关功能消费

## Impact
- Affected specs: `admin-system`
- Affected code:
  - 前端：`src/pages/technician/TechnicianListPage.tsx`、`src/pages/service/ServiceListPage.tsx`、`src/pages/finance/FinancePage.tsx`、`src/pages/member/MemberListPage.tsx`、`src/pages/member/MemberDetailPage.tsx`
  - 服务层：`src/services/technician.ts`、`src/services/service.ts`、`src/services/finance.ts`、`src/services/member.ts`、`src/services/memberCard.ts`
  - 云函数：扩展或新增分类配置、收入录入、会员卡关联相关接口
  - 数据：`service_categories`（新增）、`consumption_records`（新增费用明细与技师服务关联字段）、`members`（生日字段校验与保存、积分/累计消费回写）、`member_cards`（会员关联状态）、`points_records`（积分奖励流水）
- Breaking change: 无
