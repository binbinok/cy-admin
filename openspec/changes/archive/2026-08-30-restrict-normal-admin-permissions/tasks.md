# 实施清单

## 1. 云函数

- [x] 1.1 `adminGetMemberList`：普通管理员必须传 `phoneLast4`（4 位数字），仅返回尾号匹配会员
- [x] 1.2 `adminGetMemberDetail`：普通管理员调用时手机号脱敏、不返回消费记录
- [x] 1.3 白名单外全部云函数补充 `super_admin` 拦截（脚本批量插入 + 逐个语法检查 + 人工复查报告）
- [x] 1.4 部署全部改动云函数

## 2. 前端

- [x] 2.1 `AdminLayout`：普通管理员菜单仅显示「预约订单」，其他路由重定向到 `/appointments`
- [x] 2.2 `LoginPage`：登录成功后按角色落地（普通管理员 → `/appointments`）
- [x] 2.3 `src/services/member.ts`：`adminGetMemberList` 参数增加 `phoneLast4`
- [x] 2.4 `AppointmentListPage` 新增预约弹窗：普通管理员会员选择改为「输入手机尾号查询」
- [x] 2.5 `IncomeEntryModal`：普通管理员会员选择改为「输入手机尾号查询」

## 3. 验证

- [x] 3.1 全部改动云函数 `node --check` 通过
- [x] 3.2 `tsc --noEmit` + `eslint` 通过
- [x] 3.3 `vitest --run` 全部通过（更新受影响测试）
- [x] 3.4 `openspec validate restrict-normal-admin-permissions --strict` 通过
