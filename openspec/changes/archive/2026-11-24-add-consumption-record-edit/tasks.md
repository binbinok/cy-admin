# 实施清单

## 1. 云函数

- [ ] 1.1 新增 `adminUpdateConsumptionRecord`：校验超级管理员、记录存在性、服务时间格式；仅更新 `serviceTime` 与 `note`
- [ ] 1.2 会员 `lastConsumptionAt` 同步：仅当被修改记录原为该会员最近一条消费时更新
- [ ] 1.3 写入操作日志 `update_consumption_record`
- [ ] 1.4 `cloudbaserc.json` 注册新函数

## 2. 前端

- [ ] 2.1 `src/constants/api.ts`：新增 `CF_UPDATE_CONSUMPTION_RECORD`
- [ ] 2.2 `src/types/finance.ts`：新增 `UpdateConsumptionRecordPayload`
- [ ] 2.3 `src/services/finance.ts`：新增 `adminUpdateConsumptionRecord`
- [ ] 2.4 新增 `src/components/finance/ConsumptionRecordEditModal.tsx`：服务时间 + 备注修改弹窗
- [ ] 2.5 `FinancePage` 消费记录表：新增「操作」列（仅超级管理员可见），接入修改弹窗并在成功后刷新财务数据

## 3. 测试

- [ ] 3.1 `tests/unit/finance-service.test.ts`：新增 `adminUpdateConsumptionRecord` 服务调用测试
- [ ] 3.2 新增 `tests/unit/ConsumptionRecordEditModal.test.tsx`：弹窗回填与提交参数测试

## 4. 验证

- [ ] 4.1 `eslint --max-warnings 0` 通过
- [ ] 4.2 `vitest --run` 全部通过
- [ ] 4.3 TypeScript 类型检查通过
- [ ] 4.4 `openspec validate add-consumption-record-edit --strict` 通过
