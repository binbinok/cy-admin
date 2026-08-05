# Change: 会员表单放宽与预约散客支持

## Why

当前管理后台在日常运营中存在以下三个阻塞点：

1. 会员创建表单要求昵称、手机号均为必填项，但美甲美睫店铺常遇到不愿或不便提供完整信息的客户，导致无法建档。
2. 会员卡管理页的折扣等级删除操作会报错"折扣等级 ID 不能为空"。根因是前端调用时参数名为 `discountLevelId`，而云函数 `adminDeleteDiscountLevel` 与 `adminUpdateDiscountLevel` 读取的是 `event.levelId`，参数名不匹配导致校验失败。
3. 新增预约表单仅支持从会员列表中选择会员，而到店客户可能是未注册会员的散客，缺少自由输入的散客预约入口。

这些问题迫使管理员绕过系统或手动记录，增加了出错概率和管理成本。

## What Changes

### 会员管理 - 创建表单放宽

- 将会员创建表单中的昵称、手机号、生日全部改为非必填项。
- 新增"微信号"输入框，同样为非必填项。
- 增加整体校验规则：昵称、手机号、微信号三者至少填写一项方可提交。
- 当提供手机号时，仍校验格式为 `1[3-9]\d{9}` 并执行唯一性查重；未提供手机号时跳过查重。
- 会员列表对空昵称、空手机号、空微信号提供兜底展示（如"未命名会员"、"-"），避免显示 undefined。

### 会员卡管理 - 折扣等级参数兼容

- 修复折扣等级删除/更新云函数的参数读取逻辑，兼容 `event.levelId || event.discountLevelId`。
- 保持对旧调用方（使用 `levelId`）的向后兼容，同时修复前端使用 `discountLevelId` 时的报错。
- `adminAssignDiscountLevel` 参数已一致，不在本次变更范围内。

### 预约订单 - 散客支持

- 新增预约表单的会员选择改为 AutoComplete，支持从现有会员中选择，同时允许管理员自由输入散客姓名。
- 散客预约要求填写姓名（必填），可填写手机号（选填）。
- 会员预约保持现有 memberId 选择方式；散客预约不写入 members 集合。
- 完成散客预约服务时，不产生会员积分、不更新累计消费；消费记录中回退写入 guestName，便于财务与业绩展示。

## Impact

- Affected specs: `admin-system`
- Affected code:
  - 前端页面：`src/pages/member/MemberListPage.tsx`、`src/pages/appointment/AppointmentListPage.tsx`
  - 服务层：`src/services/member.ts`、`src/services/appointment.ts`
  - 类型定义：`src/types/member.ts`、`src/types/appointment.ts`
  - 云函数：`cloudfunctions/adminCreateMember/index.js`、`cloudfunctions/adminCreateAppointment/index.js`、`cloudfunctions/adminDeleteDiscountLevel/index.js`、`cloudfunctions/adminUpdateDiscountLevel/index.js`、`cloudfunctions/adminCompleteService/index.js`
  - 测试：`tests/unit/member-service.test.ts`、`tests/unit/appointment-service.test.ts` 等
- Breaking change: 无
