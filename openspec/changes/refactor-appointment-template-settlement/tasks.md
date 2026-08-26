# 实施任务

## 1. 模板层（数据 + 云函数）

- [x] 1.1 新增 `service_templates` 集合及索引（`initDatabaseIndexes` 增补 categoryId 索引）
- [x] 1.2 新增模板 CRUD 云函数：`adminGetServiceTemplates`、`adminCreateServiceTemplate`、`adminUpdateServiceTemplate`、`adminToggleServiceTemplateStatus`
- [x] 1.3 新增种子初始化：`initServiceTemplates`（六大类模板 + 款式/附加项种子，幂等）
- [x] 1.4 改造 `adminGetServiceList` 返回模板数据（或保持旧行为供 C 端，新增 `adminGetServiceTemplate` 给管理端）—— 采用保持旧行为供 C 端，新增 `adminGetServiceTemplates` 给管理端
- [x] 1.5 废弃 `adminCreateService` / `adminUpdateService` / `adminToggleServiceStatus` 对 `services` 的写入，改为操作模板 —— 旧函数返回迁移提示错误，前端改用模板 CRUD
- [x] 1.6 新增 `src/constants/template.ts`：二级分类常量（六大类 + 款式 + 附加项目种子数据，前端硬编码）
- [x] 1.7 前端模板管理页：新增/编辑表单分类字段改为 `<Cascader>` 二级菜单（大类→款式），新增附加项目独立 `<Checkbox.Group>` 区域
- [x] 1.8 更新 `src/types/service.ts`：新增 `CascaderOption`、`AddonOption` 类型

## 2. 预约层改造

- [x] 2.1 `adminCreateAppointment`：入参由 `serviceId` 改为 `categoryId`，新增 `duration`（默认取模板 `defaultDuration`，可手动覆盖）
- [x] 2.2 时段冲突校验改为按 `[time, time + duration)` 区间计算
- [x] 2.3 `adminGetAppointmentList`：返回大类名称与时长，历史数据按 `serviceId` 快照兜底展示（记录整体返回，前端优先 `categoryName`、兜底 `serviceName`）
- [x] 2.4 前端预约页：表单简化为 顾客 / 技师 / 服务大类 / 日期时间 / 时长（可编辑）/ 备注
- [x] 2.5 更新 `src/types/appointment.ts`、`src/services/appointment.ts`、`src/constants/api.ts`
- [x] 2.6 新增 `src/stores/incomePrefillStore.ts`：跨页预填 store（Zustand），承载预约→财务的收入录入预填数据
- [x] 2.7 预约列表"完成服务"按钮改为跳转 `/finance` 并写入预填 store（预约编号、技师、会员/散客、服务时间、备注）

## 3. 结算层

- [x] 3.1 新增共享结算模块（云函数 `_shared/settlement.js`）：金额重算、折扣、校验、积分/提成/日志写入
- [x] 3.2 新增 `adminCreateSettlement` 云函数（完整入参校验：恰好 1 个基础项目、支付合计 = 实收、改价必填原因、实收 ≥ 0）
- [x] 3.3 改造 `adminCompleteService` 为薄封装：委托共享结算模块并联动预约状态 → completed
- [x] 3.4 `consumption_records` 扩展结算明细字段（基础项目快照、附加项、自定义附加项、原价/折扣/应收/改价/实收、支付明细）
- [x] 3.5 支付方式枚举新增 `meituan`（前后端同步）
- [x] 3.6 前端收入录入页重构为 5 区域结算录入（基础信息 / 基础项目 / 附加项目 / 价格明细 / 支付信息），实时价格明细
- [x] 3.7 `adminGetConsumptionList` 返回结算明细字段（记录整体返回，明细字段随文档带出）
- [x] 3.8 废弃 `adminCreateIncomeRecord`（前端改调 `adminCreateSettlement`，云函数保留一个版本周期后从 `cloudbaserc.json` 移除）
- [x] 3.9 前端收入录入弹窗服务分类字段改为 `<Cascader>` 二级菜单（复用 `BASE_ITEM_CASCADER_OPTIONS`），新增附加项目 `<Checkbox.Group>` 区域，与模板管理页一致
- [x] 3.10 前端收入录入弹窗支持预填：从 `incomePrefillStore` 读取预约数据并回填技师/会员/散客姓名/服务时间/服务分类/备注
- [x] 3.11 收入录入提交逻辑适配 Cascader 路径：`serviceCategory` 取路径首级，`serviceName` 取路径末级，附加项目与散客姓名合并写入 note

## 4. 统计口径切换

- [x] 4.1 `adminGetFinanceSummary` / `adminGetRevenueTrend`：按实收统计（`consumption_records.amount` 即实收，已验证口径一致）
- [x] 4.2 `adminGetServiceRevenue`：按结算明细 `categoryId` 归属，历史数据按旧字段兜底
- [x] 4.3 `adminGetTechnicianPerformance`：按最终结算统计（基于 `consumption_records`，已验证口径一致）
- [x] 4.4 `adminGetCommissionReport`：按可提成项目金额汇总 × 技师比例（`commission_records.serviceAmount` 即结算层写入的可提成金额）
- [x] 4.5 提成记录生成逻辑：仅汇总 `commissionable = true` 项目金额（`_shared/settlement.js` 实现）

## 5. 测试

- [x] 5.1 属性测试：价格规则不变量（原价 = 基础 + 附加；应收 = 原价 - 折扣；实收 = 应收 + 改价；支付合计 = 实收）—— `tests/property/settlement.property.test.ts`
- [x] 5.2 属性测试：积分按实收 `floor(amount/10)`、提成仅作用于可提成项目
- [x] 5.3 单元测试：结算入参校验（无基础项目/多基础项目/改价无原因/支付不平）—— `tests/unit/settlement.test.ts`
- [x] 5.4 单元测试：预约时长默认值与手动覆盖、时段冲突区间计算 —— `tests/unit/appointment-time.test.ts`
- [x] 5.5 更新受影响的现有测试（预约、财务、提成）—— `appointment-service.test.ts` / `service-service.test.ts` / `AppointmentListPage.test.ts` / `ServiceListPage.test.ts`

## 6. 文档与部署

- [x] 6.1 更新 `AGENTS.md` 关键文件速查与数据集合说明
- [x] 6.2 更新 `DEPLOY.md`：新云函数部署、`initServiceTemplates` 初始化步骤
- [x] 6.3 `cloudbaserc.json` 注册新云函数并配置环境变量/超时
