# 实施任务

## 1. 云函数

- [x] 1.1 新增 `adminCreateMemberCard`：选择折扣等级开通储值卡并归属会员（初始余额 0，已有 active 卡拒绝重复开通）
- [x] 1.2 新增 `adminCancelMemberCard`：注销语义（status=cancelled 留档），校验链 = 超管 + 原因 + 手机号后 4 位 + 管理员密码；余额 > 0 必填 balanceAction
- [x] 1.3 废弃并删除 `adminBindMemberCard` / `adminUnbindMemberCard` / `adminGetAvailableMemberCards`（本地目录 + 云端 + cloudbaserc.json）
- [x] 1.4 `adminRechargeCard` 删除"无卡自动建白板卡"分支，且仅对 active 卡充值
- [x] 1.5 `adminGetMemberDetail` / `adminGetMemberCardAssociation` 持卡查询增加 `status='active'` 过滤
- [x] 1.6 `cloudbaserc.json` 注册 `adminCreateMemberCard` / `adminCancelMemberCard`
- [x] 1.7 历史遗留空闲卡（memberId=''）一次性冻结留档（临时函数执行后已删除）

## 2. 前端

- [x] 2.1 编辑会员表单生日改 `DatePicker`（回填 `dayjs(member.birthday)`，提交 `format('YYYY-MM-DD')`）
- [x] 2.2 开通会员卡弹窗：折扣等级下拉（等级名 + N 折），打开时拉取折扣等级列表
- [x] 2.3 注销会员卡弹窗：卡片摘要 + 余额红色警示 + 余额处理方式单选（仅余额 > 0 时出现）+ 原因下拉（其他必填备注）+ 手机号后 4 位 + 管理员密码
- [x] 2.4 修复充值弹窗桩代码：真实调用 `adminRechargeCard`（元转分）；入口互斥（有卡显示充值/注销，无卡显示开通）
- [x] 2.5 更新 `src/constants/api.ts`、`src/services/memberCard.ts`、`src/types/member.ts`（status 增加 cancelled）

## 3. 测试与验证

- [x] 3.1 更新 `memberCard-service` 单元测试（移除 bind/unbind/available，新增 create/cancel）
- [x] 3.2 `lint` + `tsc --noEmit` + `vitest` 全过
- [x] 3.3 部署全部变更云函数并线上验证注销校验链
