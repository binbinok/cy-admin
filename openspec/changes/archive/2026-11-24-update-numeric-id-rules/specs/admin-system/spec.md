# admin-system 规格增量

## ADDED Requirements

### Requirement: 会员编号规则

系统 SHALL 为每位会员分配纯数字会员编号：全局从 10001 起递增，不按时间重置。

编号 SHALL 通过计数器原子递增生成，全局唯一；`members.memberId` 的唯一索引约束 SHALL 保留。

存量会员 SHALL 在本次变更中按创建时间升序迁移为 10001 起的连续数字编号；所有以 `memberId` 冗余关联的业务集合 SHALL 同步改写，保持关联一致。

操作日志 SHALL NOT 改写，历史日志保留旧编号供追溯。

#### Scenario: 新会员编号

- **WHEN** 管理员创建新会员
- **THEN** 系统 SHALL 分配计数器下一个数字编号，与存量迁移编号连续

#### Scenario: 存量迁移排序

- **WHEN** 存量迁移执行后对比任两名会员
- **THEN** 创建时间较早的会员 SHALL 获得较小的数字编号，且首个编号为 10001

#### Scenario: 关联数据一致

- **WHEN** 存量迁移执行后查询某会员的会员卡、次卡、预约、消费、积分与卡流水记录
- **THEN** 上述记录的 memberId SHALL 与该会员新编号一致

#### Scenario: 新编号格式展示

- **WHEN** 管理员在会员搜索框输入完整数字编号
- **THEN** 系统 SHALL 能命中对应会员
