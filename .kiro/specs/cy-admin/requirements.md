# 需求文档

## 简介

本系统是美甲美睫店铺 PC 管理系统（B 端），为店铺管理员提供完整的后台管理能力。系统通过浏览器访问，与用户端微信小程序共享同一套 CloudBase 云函数和云数据库后端。

核心功能包括：管理系统账号管理、会员信息管理、技师与排班管理、预约订单处理、店铺记账与财务统计。

> 📌 **项目范围说明**：本项目为管理端（B 端），与用户端微信小程序（C 端）共享 CloudBase 云函数和云数据库。管理端通过云函数调用，所有操作需要管理员身份验证。

---

## 术语表

- **管理系统 (Admin_System)**: 美甲美睫店铺 PC 管理后台，供管理员操作的 B 端系统
- **管理员 (Admin)**: 拥有后台账号、可登录管理系统的店铺工作人员
- **超级管理员 (Super_Admin)**: 拥有最高权限的管理员，可管理其他管理员账号
- **会员 (Member)**: 店铺的顾客，可通过用户端小程序注册或由管理员在管理系统中手动添加，拥有会员等级和积分
- **技师 (Technician)**: 提供美甲美睫服务的店铺员工
- **服务项目 (Service_Item)**: 店铺提供的美甲、美睫等具体服务
- **预约 (Appointment)**: 会员通过小程序创建的服务预约记录
- **消费记录 (Consumption_Record)**: 会员完成服务后生成的消费流水
- **会员等级 (Member_Level)**: 根据累计消费金额划分的层级（普通 < 1000 元、银卡 1000–4999 元、金卡 5000–9999 元、钻石 ≥ 10000 元）
- **积分 (Points)**: 会员消费获得的奖励点数（每消费 1 角获得 1 积分，即每消费 1 元获得 10 积分）
- **会员卡 (Member_Card)**: 店铺发行的储值卡，持卡会员消费时享受对应折扣优惠
- **排班 (Schedule)**: 技师每周各天的工作时间段配置
- **提成 (Commission)**: 技师完成服务或销售卡项后按比例获得的薪酬奖励
- **财务报表 (Financial_Report)**: 按时间维度汇总的收入统计数据

---

## 需求

### 需求 1：管理系统账号管理

**用户故事：** 作为超级管理员，我希望能够管理后台账号，以便控制哪些人员可以访问管理系统及其权限范围。

#### 验收标准

1. THE Admin_System SHALL 提供账号密码登录入口，要求输入用户名和密码
2. WHEN 管理员输入正确的用户名和密码 THEN THE Admin_System SHALL 验证身份并颁发访问令牌，跳转至管理后台首页
3. IF 管理员输入错误的用户名或密码 THEN THE Admin_System SHALL 返回"用户名或密码错误"提示，且不暴露具体失败原因
4. IF 管理员连续登录失败 5 次 THEN THE Admin_System SHALL 锁定该账号 30 分钟并提示锁定原因
5. WHEN 超级管理员创建新管理员账号 THEN THE Admin_System SHALL 要求填写用户名（4–20 字符）、初始密码（8–32 字符）和角色（普通管理员 / 超级管理员）
6. WHEN 超级管理员禁用管理员账号 THEN THE Admin_System SHALL 立即使该账号的所有活跃会话失效
7. WHEN 管理员修改自己的密码 THEN THE Admin_System SHALL 要求输入当前密码进行验证，新密码长度为 8–32 字符
8. WHEN 管理员的访问令牌过期 THEN THE Admin_System SHALL 跳转至登录页面并提示"登录已过期，请重新登录"
9. THE Admin_System SHALL 记录每次登录的时间、IP 地址和操作结果，供超级管理员查阅
10. WHEN 管理员登录成功 THEN THE Admin_System SHALL 将访问令牌和用户信息持久化存储至 localStorage，使管理员关闭浏览器后再次打开时无需重新登录
11. WHEN 管理员再次打开管理系统 THEN THE Admin_System SHALL 自动从 localStorage 读取已保存的令牌，验证令牌未过期后恢复登录状态，跳过登录页面
12. IF 管理员再次打开管理系统时已保存的令牌已过期 THEN THE Admin_System SHALL 清除 localStorage 中的令牌和用户信息，跳转至登录页面

---

### 需求 2：会员信息管理

**用户故事：** 作为管理员，我希望能够查看、管理和手动添加会员信息，以便了解会员状况、维护会员关系并支持线下到店顾客的会员录入。

#### 验收标准

1. WHEN 管理员进入会员列表页面 THEN THE Admin_System SHALL 显示所有会员的姓名/昵称、手机号（脱敏显示后 4 位）、会员等级、积分余额、累计消费金额和注册时间
2. WHEN 管理员按关键词搜索会员 THEN THE Admin_System SHALL 支持按昵称、手机号或会员编号进行模糊匹配，并在 1 秒内返回结果
3. WHEN 管理员按会员等级筛选 THEN THE Admin_System SHALL 显示指定等级（普通 / 银卡 / 金卡 / 钻石）的会员列表
4. WHEN 管理员查看会员详情 THEN THE Admin_System SHALL 显示会员基本信息、会员等级、积分余额、累计消费金额、注册时间、来源渠道和生日
5. WHEN 管理员查看会员消费记录 THEN THE Admin_System SHALL 显示该会员的历史消费列表，包含日期、服务项目、实际金额和获得积分，按时间倒序排列
6. WHEN 管理员编辑会员信息 THEN THE Admin_System SHALL 允许修改昵称（2–20 字符）、手机号（符合 1[3-9]\d{9} 格式）和生日（YYYY-MM-DD 格式）
7. IF 管理员提交的手机号已被其他会员绑定 THEN THE Admin_System SHALL 拒绝保存并提示"该手机号已被其他会员使用"
8. WHEN 管理员查看会员概览 THEN THE Admin_System SHALL 显示近期生日会员列表（今天、未来 3 天、未来 7 天三个维度）
9. WHEN 管理员查看会员消费指标 THEN THE Admin_System SHALL 显示指定会员的消费次数、到店频次（近 30 天）和累计消费金额
10. WHEN 管理员为会员充值会员卡 THEN THE Admin_System SHALL 要求输入充值金额（大于 0），更新会员卡余额并生成充值流水记录
11. WHEN 管理员查看会员持卡信息 THEN THE Admin_System SHALL 显示会员卡余额、累计充值金额、关联折扣等级和充值流水列表
12. WHEN 管理员在会员列表页面点击"添加会员" THEN THE Admin_System SHALL 显示添加会员表单，要求填写昵称（2–20 字符）和手机号（符合 1[3-9]\d{9} 格式），并允许选填生日（YYYY-MM-DD 格式）
13. WHEN 管理员提交添加会员表单 THEN THE Admin_System SHALL 创建新会员记录，来源渠道标记为"管理端添加"，会员等级默认为"普通"，积分余额默认为 0，累计消费金额默认为 0
14. IF 管理员添加会员时提交的手机号已被其他会员绑定 THEN THE Admin_System SHALL 拒绝创建并提示"该手机号已被其他会员使用"
15. IF 管理员添加会员时提交的手机号格式不符合 1[3-9]\d{9} THEN THE Admin_System SHALL 拒绝提交并提示"请输入正确的手机号格式"
16. WHEN 管理员成功添加会员 THEN THE Admin_System SHALL 在操作日志中记录该添加操作，包含操作人、操作时间和新会员信息
17. WHEN 管理员成功添加会员 THEN THE Admin_System SHALL 自动刷新会员列表，新添加的会员出现在列表中

---

### 需求 3：技师信息与排班管理

**用户故事：** 作为管理员，我希望能够管理技师信息和排班，以便合理安排服务资源并保持预约系统准确。

#### 验收标准

1. WHEN 管理员进入技师管理页面 THEN THE Admin_System SHALL 显示所有技师的姓名、头像、擅长项目、当前状态（空闲 / 忙碌 / 休息）和本周排班概览
2. WHEN 管理员添加技师 THEN THE Admin_System SHALL 要求填写姓名（2–10 字符）、擅长项目（至少选择 1 项）和初始状态
3. WHEN 管理员编辑技师信息 THEN THE Admin_System SHALL 允许修改姓名、头像、擅长项目
4. WHEN 管理员设置技师排班 THEN THE Admin_System SHALL 允许为每周各天（周一至周日）配置上班时间段（开始时间、结束时间）和休息时段，并立即更新小程序端可预约时间
5. WHEN 管理员为技师添加可预约服务项目 THEN THE Admin_System SHALL 允许在指定时间段内关联一个或多个服务项目，会员预约时仅可选择该技师在对应时段支持的服务
6. WHEN 管理员修改技师时间段的可预约服务项目 THEN THE Admin_System SHALL 更新关联关系并立即同步至小程序端
7. WHEN 管理员将技师状态修改为休息 THEN THE Admin_System SHALL 将该技师从小程序端可选技师列表中移除
8. IF 管理员将有未完成预约的技师状态修改为休息 THEN THE Admin_System SHALL 显示未完成预约数量并要求管理员确认后方可执行
9. WHEN 管理员删除技师 THEN THE Admin_System SHALL 检查该技师是否存在未完成预约，若存在则拒绝删除并提示未完成预约数量

---

### 需求 4：服务项目管理

**用户故事：** 作为管理员，我希望能够管理服务项目，以便及时更新服务内容、价格和上下架状态。

#### 验收标准

1. WHEN 管理员进入服务管理页面 THEN THE Admin_System SHALL 显示所有服务项目的名称、分类、价格、时长和上架状态，支持按分类筛选和按名称搜索
2. WHEN 管理员添加服务项目 THEN THE Admin_System SHALL 要求填写名称（2–30 字符）、分类（美甲 / 美睫 / 指甲护理 / 套餐）、价格（大于 0 的数值，单位元）、时长（大于 0 的整数，单位分钟）和描述
3. WHEN 管理员编辑服务项目 THEN THE Admin_System SHALL 保存修改并立即同步至小程序端展示
4. WHEN 管理员下架服务项目 THEN THE Admin_System SHALL 将服务状态设为不可用，已有预约保持有效，新预约不可选择该服务
5. WHEN 管理员上架服务项目 THEN THE Admin_System SHALL 将服务状态设为可用，小程序端立即可见
6. IF 管理员提交的服务价格不是大于 0 的数值 THEN THE Admin_System SHALL 拒绝保存并提示"价格必须大于 0"

---

### 需求 5：预约订单管理

**用户故事：** 作为管理员，我希望能够查看和处理预约订单，以便高效管理店铺日常运营。

#### 验收标准

1. WHEN 管理员进入预约管理页面 THEN THE Admin_System SHALL 默认显示当日预约列表，包含预约编号、会员信息、服务项目、技师、预约时间、人数、备注和当前状态
2. WHEN 管理员按日期范围筛选预约 THEN THE Admin_System SHALL 显示指定日期范围内的预约列表
3. WHEN 管理员按技师筛选预约 THEN THE Admin_System SHALL 显示指定技师的预约列表
4. WHEN 管理员按状态筛选预约 THEN THE Admin_System SHALL 显示指定状态（待服务 / 服务中 / 已完成 / 已取消）的预约列表
5. WHEN 管理员按顾客信息检索预约 THEN THE Admin_System SHALL 支持按会员昵称、手机号或会员编号进行模糊匹配
6. WHEN 管理员确认会员到店 THEN THE Admin_System SHALL 将预约状态从"待服务"更新为"服务中"
7. WHEN 管理员完成服务并输入实际消费金额 THEN THE Admin_System SHALL 将预约状态更新为"已完成"，生成消费记录，并按消费金额计算积分累加至会员账户
8. WHEN 管理员输入的实际消费金额为 0 THEN THE Admin_System SHALL 允许提交，表示本次服务免费，不产生积分
9. WHEN 管理员取消预约 THEN THE Admin_System SHALL 将预约状态更新为"已取消"并释放对应时间段

---

### 需求 6：店铺记账与财务统计

**用户故事：** 作为管理员，我希望能够查看店铺收入统计和消费记录，以便掌握经营状况并进行财务核算。

#### 验收标准

1. WHEN 管理员进入财务统计页面 THEN THE Admin_System SHALL 显示今日、本周、本月的总收入金额和完成订单数
2. WHEN 管理员查看收入趋势 THEN THE Admin_System SHALL 以折线图展示指定日期范围内每日收入变化
3. WHEN 管理员查看服务项目收入分布 THEN THE Admin_System SHALL 以图表展示各服务分类的收入占比
4. WHEN 管理员查看消费记录列表 THEN THE Admin_System SHALL 显示所有消费记录，包含日期、会员信息、服务项目、实际金额和技师，支持按日期范围和技师筛选
5. WHEN 管理员按日期范围查询财务数据 THEN THE Admin_System SHALL 在 3 秒内返回汇总结果
6. WHEN 管理员查看技师业绩统计 THEN THE Admin_System SHALL 显示指定时间段内每位技师的完成订单数和服务总收入

---

### 需求 7：员工提成核算

**用户故事：** 作为管理员，我希望能够核算技师提成，以便进行薪酬管理。

#### 验收标准

1. WHEN 管理员查看提成报表 THEN THE Admin_System SHALL 显示指定时间段内每位技师的完成服务次数、服务总金额和应得提成金额
2. WHEN 技师完成服务 THEN THE Admin_System SHALL 按服务实际金额的 30% 计算该技师的服务提成
3. WHEN 管理员设置自定义提成比例 THEN THE Admin_System SHALL 允许为每位技师单独配置提成比例（1%–100%），并对后续完成的服务生效
4. IF 管理员设置的提成比例不在 1%–100% 范围内 THEN THE Admin_System SHALL 拒绝保存并提示有效范围

---

### 需求 8：会员关系维护

**用户故事：** 作为管理员，我希望能够维护会员关系，以便提升会员满意度和复购率。

#### 验收标准

1. WHEN 管理员查看会员触达记录 THEN THE Admin_System SHALL 显示该会员最近一次消费距今天数和最近一次通知发送时间
2. WHEN 会员生日当天 THEN THE Admin_System SHALL 在管理后台首页的待办事项中显示当日生日会员列表
3. WHEN 管理员手动发送生日祝福通知 THEN THE Admin_System SHALL 通过微信订阅消息向该会员发送生日祝福，并记录发送时间
4. IF 管理员在同一自然月内对同一会员重复发送生日祝福 THEN THE Admin_System SHALL 提示"本月已发送过生日祝福"并阻止重复发送
5. WHEN 管理员查看长期未到店会员 THEN THE Admin_System SHALL 显示超过 60 天未消费的会员列表，按最后消费时间升序排列

---

### 需求 10：会员卡与折扣管理

**用户故事：** 作为管理员，我希望能够配置会员卡折扣规则并为会员充值，以便通过储值优惠提升会员粘性和复购率。

#### 验收标准

1. WHEN 管理员进入会员卡管理页面 THEN THE Admin_System SHALL 显示所有折扣等级配置，包含等级名称、折扣比例（如 9 折）和最低充值金额门槛
2. WHEN 管理员创建折扣等级 THEN THE Admin_System SHALL 要求填写等级名称（2–20 字符）、折扣比例（1%–99%，即最低 1 折最高 99 折）和最低充值门槛金额（≥ 0 元）
3. WHEN 管理员编辑折扣等级 THEN THE Admin_System SHALL 保存修改，修改后对该等级的后续消费立即生效
4. WHEN 管理员删除折扣等级 THEN THE Admin_System SHALL 检查是否有会员卡关联该等级，若存在则拒绝删除并提示关联会员数量
5. WHEN 管理员为会员卡指定折扣等级 THEN THE Admin_System SHALL 将该折扣等级绑定至会员卡，会员消费时自动按折扣比例计算实付金额
6. WHEN 会员使用会员卡消费 THEN THE Admin_System SHALL 按会员卡关联折扣比例计算折后金额，并从会员卡余额中扣减
7. IF 会员卡余额不足以支付折后金额 THEN THE Admin_System SHALL 提示余额不足并显示当前余额
8. WHEN 管理员查看会员卡充值记录 THEN THE Admin_System SHALL 显示所有充值流水，包含充值时间、充值金额、操作管理员和充值后余额

---

### 需求 11：数据安全与权限控制

**用户故事：** 作为系统，我需要确保管理端数据访问安全，以便防止未授权操作和数据泄露。

#### 验收标准

1. THE Admin_System SHALL 对所有管理端云函数调用进行身份验证，未携带有效令牌的请求返回 401 错误
2. WHILE 管理员已登录 THEN THE Admin_System SHALL 在管理员无操作超过 2 小时后自动注销会话并清除 localStorage 中的令牌和用户信息
3. THE Admin_System SHALL 在展示会员手机号时仅显示后 4 位，完整手机号仅在管理员明确点击"查看完整号码"后显示
4. WHEN 管理员执行删除或批量操作 THEN THE Admin_System SHALL 要求二次确认后方可执行
5. THE Admin_System SHALL 记录管理员的关键操作日志（登录、修改会员信息、添加会员、完成服务、修改提成比例），包含操作人、操作时间和操作内容
