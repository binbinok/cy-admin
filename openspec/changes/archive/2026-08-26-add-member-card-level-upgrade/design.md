# 设计：会员卡等级升级逻辑

## Context

会员卡已账户化（`update-member-card-interactions`）：卡与会员 1:1 归属，`member_cards.discountLevelId` 在开卡时确定。折扣等级集合 `card_discount_levels` 字段为 `name` / `discountRate` / `minRechargeAmount`，**没有显式的等级排序字段**。用户已拍板：不做累计充值升级，单次充值达标才升级（方式 A 自动匹配）；同时做管理员手动调整兜底。

## Goals / Non-Goals

- Goals：
  - 充值时按金额自动匹配可升最高等级，只升不降，支持跨级；
  - 等级变更全量留痕（levelHistory + operation_logs）；
  - 超管手动调整等级（允许下调），原因必填；
  - 前端充值弹窗实时升级提示。
- Non-Goals：
  - 不做累计充值升级、不做到期降级、不做等级有效期；
  - 不迁移历史卡数据（levelHistory 从变更发生时开始记录）；
  - 次卡体系（另案讨论）。

## Decisions

### 等级排序推导

- 决策：以 `minRechargeAmount` 升序定义等级高低，门槛相同者按 `discountRate` 小者为高（折扣越低等级越高）。
- 理由：不引入新字段，避免存量数据迁移；门槛金额即业务上的等级台阶。
- 备选：给等级加 `sortOrder` 字段——被否，增加维护成本且与门槛语义重复。
- 边界：`minRechargeAmount` 为 0 或缺失的等级视为最低级，不作为升级目标。

### 升级判定时机

- 决策：在 `adminRechargeCard` 门槛校验通过后、余额更新前计算目标等级，同一次数据库更新内写入 `discountLevelId` + `levelHistory`（`_.push`），随后写充值流水与日志。
- 理由：CloudBase NoSQL 无多文档事务，单文档 update 内完成卡字段变更是将不一致窗口压到最小；流水与日志失败不影响卡状态已生效的事实，可接受。
- 判定规则：目标等级 = 所有满足 `minRechargeAmount <= rechargeAmount` 且排序高于当前等级的等级中最高者；当前等级文档缺失时以"最低级"参与比较（即任何达标等级均可升级）。

### 手动调整

- 决策：新增 `adminUpdateCardLevel`（入参 `{ memberId, targetLevelId, reason }`），仅超管，允许上调与下调，`reason` 必填写入留痕；不要求密码二次确认。
- 理由：手动调整本身不直接动钱（不改余额），风险低于注销卡；超管 + 原因留痕已满足审计。若后续证明有滥用再加密码校验。

### 前端提示数据来源

- 决策：会员详情页已有 `useQuery(['discountLevels'])` 的等级列表缓存，充值弹窗基于它实时计算"输入金额可达的最高等级"，无需新增接口。

## Risks / Trade-offs

- 等级门槛被调低后，历史卡可能出现"当前等级排序高于按新门槛应得等级"——只升不降规则天然兼容，不处理。
- 两个等级门槛相同会导致推导排序歧义 → 按 `discountRate` 兜底；管理端不强制门槛唯一，留文档约定。
- 手动下调等级会影响后续消费的折扣 → 原因必填 + 日志留痕，front端仅超管可见入口。

## Migration Plan

- 无需数据迁移；`levelHistory` 为新增可选字段。
- 部署顺序：先部署 `adminRechargeCard` / `adminUpdateCardLevel`，再发布前端。
- 回滚：重新部署旧版云函数即可，levelHistory 已写入数据保留无副作用。

## Open Questions

- 无。
