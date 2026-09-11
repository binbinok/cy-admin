# 任务清单：会员卡等级升级逻辑

## 1. 云函数：充值达标自动升级（adminRechargeCard）

- [x] 1.1 加载全部折扣等级并按规则排序（minRechargeAmount 升序，门槛相同按 discountRate 小者为高；门槛为 0/缺失视为最低级且不作为升级目标）
- [x] 1.2 门槛校验通过后计算目标等级：满足 `minRechargeAmount <= rechargeAmount` 且排序高于当前等级的最高者；当前等级文档缺失时按最低级参与比较
- [x] 1.3 存在更高目标等级时，在同一次卡文档更新中写入 `discountLevelId` 并 `_.push` `levelHistory`（trigger='recharge'，含原/新等级 ID 与名称、充值金额、操作人、时间）
- [x] 1.4 充值流水记录携带升级信息；操作日志在升级时记录 `action: 'upgrade_card_level'`（detail 含原/新等级名称）
- [x] 1.5 响应返回 `levelUpgraded: { fromLevelId, fromLevelName, toLevelId, toLevelName }`（未升级时不返回该字段）

## 2. 云函数：管理员手动调整等级（adminUpdateCardLevel，新增）

- [x] 2.1 新建 `cloudfunctions/adminUpdateCardLevel/`（index.js + package.json + 复制 `_shared/`），注册到 `cloudbaserc.json`
- [x] 2.2 入参校验：`memberId`、`targetLevelId` 必填，`reason` 必填非空；仅 `super_admin` 可调用
- [x] 2.3 业务校验：会员须持有 active 卡；目标等级须存在且与当前等级不同；允许上调与下调
- [x] 2.4 更新 `discountLevelId` 并写入 `levelHistory`（trigger='manual'，含 reason）；记录操作日志
- [x] 2.5 返回更新后的卡信息

## 3. 前端

- [x] 3.1 `src/constants/api.ts` 增加 `CF_UPDATE_CARD_LEVEL`；`src/services/memberCard.ts` 增加 `adminUpdateCardLevel` 封装与 `LevelHistoryEntry` / `levelUpgraded` 类型
- [x] 3.2 充值弹窗：输入金额时实时计算可达最高等级，提示「充值 ¥X 可升级至【等级名】（N 折）」；未达任何更高门槛不提示
- [x] 3.3 充值成功且返回 `levelUpgraded` 时，成功提示注明「已升级为 XX 卡」
- [x] 3.4 持卡信息区展示等级变更记录（时间、原等级 → 新等级、触发方式、操作人；无记录不展示该区块）
- [x] 3.5 持卡区增加「调整等级」入口（仅超管可见）：弹窗选择目标等级 + 必填原因，提交调用 `adminUpdateCardLevel`，成功后刷新会员详情

## 4. 测试

- [x] 4.1 充值升级判定单元/属性测试：达标升级、跨级升级、未达标保持、只升不降、门槛相同按折扣率排序、当前等级缺失兜底
- [x] 4.2 手动调整测试：非超管拒绝、reason 必填、目标等级相同拒绝、留痕字段完整
- [x] 4.3 前端相关测试更新

## 5. 验证与部署

- [x] 5.1 `tsc --noEmit`、`eslint --max-warnings 0`、`vitest --run` 全部通过
- [x] 5.2 部署 `adminRechargeCard`、`adminUpdateCardLevel`
- [x] 5.3 线上验证：充值达标自动升级 + 留痕；手动调整 + 留痕
- [x] 5.4 更新本 tasks.md 勾选状态
