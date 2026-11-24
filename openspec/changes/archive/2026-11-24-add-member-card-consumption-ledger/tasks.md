# 任务清单

- [x] 1. 新增 `adminGetCardConsumptionRecords` 云函数（按 cardId/memberId 查询，时间倒序）
- [x] 2. `_shared/settlement.js` 的 deductMemberCardPayments 写入 card_consumption_records（含 consumptionId、balanceAfter）
- [x] 3. `adminDeductCardBalance` 写入 card_consumption_records
- [x] 4. `initDatabaseIndexes` 增加 card_consumption_records 索引
- [x] 5. 前端：`src/types/member.ts` 新增 CardConsumptionRecord 类型，`src/constants/api.ts` 加函数名
- [x] 6. 前端：`src/services/memberCard.ts` 加查询方法
- [x] 7. 前端：MemberDetailPage 持卡信息 tab 增加"卡扣消费记录"表格（并接通原硬编码空数组的充值流水）
- [x] 8. 同步 _shared 副本到引用 settlement.js 的函数目录
- [x] 9. 单元测试更新
- [x] 10. lint + test 验证，部署云函数
