# 实施清单

## 1. 云函数

- [x] 1.1 `adminUpdateTechnicianStatus`：状态枚举新增 `resigned`，沿用「休息」的未完成预约拦截规则
- [x] 1.2 部署 `adminUpdateTechnicianStatus`、`adminGetTechnicianPerformance`（同批部署提成口径修复）

## 2. 前端

- [x] 2.1 `src/types/technician.ts`：status 联合类型新增 `'resigned'`
- [x] 2.2 `TechnicianListPage`：状态标签新增「离职」；新增「设为离职」操作（二次确认）；新增状态筛选
- [x] 2.3 `FinancePage` 技师业绩表：新增「显示离职员工」勾选框，默认隐藏离职技师行
- [x] 2.4 `CommissionPage` 提成报表：新增「显示离职员工」勾选框，默认隐藏离职技师行
- [x] 2.5 `AppointmentListPage` / `IncomeEntryModal` / `ScheduleBoard`：技师选项排除离职技师

## 3. 数据迁移

- [x] 3.1 本地签发 JWT 调用 `adminUpdateTechnicianStatus`，将「小佳（离职）」置为 `resigned`

## 4. 验证

- [x] 4.1 `eslint --max-warnings 0` 通过
- [x] 4.2 `vitest --run` 全部通过（新增/更新受影响测试）
- [x] 4.3 `openspec validate add-technician-resigned-status --strict` 通过
