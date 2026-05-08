# 实现计划

## 用户端功能（当前项目）

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 创建微信小程序项目结构
    - 初始化小程序项目目录结构（pages, components, services, utils, cloudfunctions）
    - 配置 app.json 页面路由和全局样式
    - 配置 project.config.json 云开发环境
    - _Requirements: 全局_
  - [x] 1.2 创建云开发环境和数据库集合
    - 初始化云开发环境
    - 创建数据库集合：members, services, technicians, appointments, consumption_records, points_records
    - 设置集合权限规则
    - _Requirements: 9.1, 9.2_
  - [x] 1.3 实现基础工具函数和类型定义
    - 创建 TypeScript 类型定义文件（Member, ServiceItem, Technician, Appointment 等）
    - 实现日期时间处理工具函数（`utils/date.ts`）
    - 实现请求封装和错误处理工具（`utils/request.ts`）
    - 实现常量配置（`utils/constants.ts`）
    - 实现通知工具函数（`utils/notification.ts`）
    - _Requirements: 全局_
  - [x] 1.4 实现云函数批量部署脚本与报告
    - 提供 `deploy-advanced.js`：扫描 `cloudfunctions/` 并并行部署（含失败重试）
    - 部署前自动读取云端 `runtime` 并对齐写回 `cloudbaserc.json`，避免 "Runtime 不支持修改" 失败
    - 输出部署报告到 `.cloudbase-deploy/reports/`
    - _Requirements: 全局_

- [x] 2. 数据模型与序列化
  - [x] 2.1 实现数据验证函数
    - 实现会员信息验证（手机号格式、昵称长度等）
    - 实现服务项目验证（必填字段、价格范围等）
    - 实现预约数据验证（时间格式、状态枚举等）
    - _Requirements: 2.3, 6.2_
  - [x] 2.2 编写数据验证属性测试
    - **Property 4: 会员信息验证正确性**
    - **Property 15: 服务项目验证正确性**
    - **Validates: Requirements 2.3, 6.2, 6.3**
  - [x] 2.3 实现数据序列化与反序列化函数
    - 实现 Member 序列化/反序列化
    - 实现 Appointment 序列化/反序列化
    - 实现 ServiceItem 序列化/反序列化
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.4 编写序列化往返属性测试
    - **Property 20: 数据序列化往返一致性**
    - **Validates: Requirements 9.3**

- [x] 3. 会员管理模块（用户端）
  - [x] 3.1 实现会员注册云函数
    - 创建 registerMember 云函数
    - 实现微信用户信息获取和会员创建逻辑
    - 实现会员编号生成算法（确保唯一性）
    - 实现初始等级和积分设置
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 3.2 编写会员注册属性测试
    - **Property 1: 新会员初始等级正确性**
    - **Property 2: 会员编号唯一性**
    - **Validates: Requirements 1.2, 1.4**
  - [x] 3.3 实现会员信息查询和更新云函数
    - 创建 getMemberProfile 云函数
    - 创建 updateMemberProfile 云函数
    - 实现会员卡二维码数据生成
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.4 编写会员信息渲染属性测试
    - **Property 3: 会员信息渲染完整性**
    - **Validates: Requirements 2.1, 2.4**
  - [x] 3.5 实现会员注册页面
    - 创建 pages/member/register 页面
    - 实现微信授权登录界面
    - 实现手机号绑定界面
    - _Requirements: 1.1, 1.3, 1.5_
  - [x] 3.6 实现个人中心页面
    - 创建 pages/member/profile 页面
    - 实现会员信息展示
    - 实现信息编辑功能
    - _Requirements: 2.1, 2.2_
  - [x] 3.7 实现会员卡页面
    - 创建 pages/member/card 页面
    - 实现会员卡展示和二维码生成
    - _Requirements: 2.4_

- [x] 4. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 5. 积分与等级系统（用户端）
  - [x] 5.1 实现积分计算函数
    - 实现消费积分计算逻辑（消费金额转积分）（`utils/points.ts`）
    - 实现积分累加和扣减逻辑
    - 实现积分记录创建
    - _Requirements: 5.3_
  - [x] 5.2 编写积分计算属性测试
    - **Property 13: 积分计算正确性**
    - **Validates: Requirements 5.3**
  - [x] 5.3 实现会员等级计算函数
    - 实现等级阈值判断逻辑（`utils/level.ts`）
    - 实现等级升级检测和更新
    - _Requirements: 5.4_
  - [x] 5.4 编写会员等级属性测试
    - **Property 14: 会员等级升级正确性**（`tests/property/level.property.test.ts`）
    - **Validates: Requirements 5.4**
  - [x] 5.5 实现消费记录和积分明细页面
    - 创建 pages/record/consumption 页面
    - 创建 pages/record/points 页面
    - 实现记录列表展示
    - 实现记录渲染工具函数（`utils/record.ts`）
    - 实现记录服务层（`services/record.service.ts`）
    - _Requirements: 5.1, 5.2_
  - [x] 5.6 编写记录渲染属性测试
    - **Property 12: 记录信息渲染完整性**（`tests/property/record.property.test.ts`）
    - **Validates: Requirements 5.1, 5.2**

- [x] 6. 服务项目模块（用户端浏览）
  - [x] 6.1 实现服务项目查询云函数
    - 创建 getServices 云函数（获取服务列表）
    - 创建 getServiceDetail 云函数（获取服务详情）
    - _Requirements: 3.1, 3.2_
  - [x] 6.2 实现服务下架逻辑
    - 实现服务状态切换（createService / updateService 云函数）
    - 确保已有预约不受影响
    - _Requirements: 6.4_
  - [x] 6.3 编写服务下架属性测试
    - **Property 16: 服务下架预约保护**
    - **Validates: Requirements 6.4**
  - [x] 6.4 实现服务列表页面
    - 创建 pages/service/list 页面
    - 实现服务分类展示
    - 实现搜索和筛选功能
    - 实现服务工具函数（`utils/service.ts`）和服务层（`services/service.service.ts`）
    - _Requirements: 3.1_
  - [x] 6.5 实现服务详情页面
    - 创建 pages/service/detail 页面
    - 实现服务详情展示
    - 实现技师和时间段选择入口
    - _Requirements: 3.2_
  - [x] 6.6 编写服务信息渲染属性测试
    - **Property 5: 服务信息渲染完整性**
    - **Validates: Requirements 3.1, 3.2**

- [x] 7. 技师查询模块（用户端）
  - [x] 7.1 实现技师查询云函数
    - 创建 getTechnicians 云函数
    - 创建 createTechnician 云函数（供管理端调用）
    - 创建 updateTechnician 云函数（供管理端调用）
    - 实现技师工具函数（`utils/technician.ts`）
    - _Requirements: 7.1_
  - [x] 7.2 实现技师可预约时段计算
    - 根据排班表计算可预约时段
    - 排除已有预约时段
    - _Requirements: 7.2_
  - [x] 7.3 编写技师排班属性测试
    - **Property 17: 技师排班与可预约时段一致性**
    - **Property 18: 技师状态与可选列表一致性**
    - **Validates: Requirements 7.2, 7.3**

- [x] 8. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 9. 预约系统核心（用户端）
  - [x] 9.1 实现时间段冲突检测函数
    - 实现时间段重叠判断逻辑
    - 实现指定技师指定日期的已占用时段查询
    - _Requirements: 3.4_
  - [x] 9.2 编写时间冲突检测属性测试
    - **Property 7: 预约时间冲突检测**
    - **Validates: Requirements 3.4**
  - [x] 9.3 实现技师自动分配函数
    - 实现空闲技师查询逻辑
    - 实现自动分配算法（优先分配预约较少的技师）
    - _Requirements: 3.5_
  - [x] 9.4 编写技师自动分配属性测试
    - **Property 8: 技师自动分配正确性**
    - **Validates: Requirements 3.5**
  - [x] 9.5 实现预约创建云函数
    - 创建 createAppointment 云函数
    - 集成时间冲突检测
    - 集成技师自动分配
    - 实现预约记录创建
    - _Requirements: 3.3, 3.4, 3.5_
  - [x] 9.6 编写预约创建属性测试
    - **Property 6: 预约创建正确性**
    - **Validates: Requirements 3.3**

- [x] 10. 预约管理功能（用户端）
  - [x] 10.1 实现预约查询云函数
    - 创建 getAppointments 云函数（会员查询）
    - 实现按状态分类查询
    - _Requirements: 4.1_
  - [x] 10.2 实现预约取消逻辑
    - 实现24小时规则判断
    - 实现时间段释放逻辑
    - 创建 cancelAppointment 云函数
    - _Requirements: 4.3, 4.4_
  - [x] 10.3 编写预约取消属性测试
    - **Property 10: 预约取消规则正确性**
    - **Validates: Requirements 4.3, 4.4**
  - [x] 10.4 实现预约修改逻辑
    - 实现新时段可用性检查
    - 创建 updateAppointment 云函数
    - _Requirements: 4.5_
  - [x] 10.5 编写预约修改属性测试
    - **Property 11: 预约修改时段可用性**
    - **Validates: Requirements 4.5**
    
  - [x] 10.6 实现预约状态转换逻辑（云函数供管理端调用）
    - 实现状态机（待服务→服务中→已完成）
    - 实现完成服务时的积分计算触发
    - 创建 confirmArrival 和 completeService 云函数
    - _Requirements: 8.2, 8.3_
  - [x] 10.7 编写预约状态机属性测试
    - **Property 19: 预约状态机正确性**
    - **Validates: Requirements 8.2, 8.3**

- [x] 11. 预约页面实现（用户端）
  - [x] 11.1 实现创建预约页面
    - 创建 pages/appointment/create 页面
    - 实现技师选择组件
    - 实现时间段选择组件
    - 实现预约确认流程
    - _Requirements: 3.2, 3.3_
  - [x] 11.2 实现预约列表页面
    - 创建 pages/appointment/list 页面
    - 实现按状态分类展示
    - 实现预约卡片组件
    - _Requirements: 4.1_
  - [x] 11.3 实现预约详情页面
    - 创建 pages/appointment/detail 页面
    - 实现预约信息展示
    - 实现取消和修改操作
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [x] 11.4 编写预约信息渲染属性测试
    - **Property 9: 预约信息渲染完整性**
    - **Validates: Requirements 4.1, 4.2**

- [x] 12. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 13. 首页与导航（用户端）
  - [x] 13.1 实现首页
    - 创建 pages/index 页面
    - 实现热门服务展示
    - 实现快捷入口（预约、会员卡、我的预约）
    - _Requirements: 全局_
  - [x] 13.2 实现底部导航栏
    - 配置 tabBar（首页、服务、预约、我的）
    - 实现页面切换
    - _Requirements: 全局_

- [x] 14. 消息通知模块（用户端）
  - [x] 14.1 实现订阅消息功能
    - 配置微信订阅消息模板
    - 实现预约提醒通知发送
    - 实现等级升级通知发送
    - _Requirements: 10.1, 10.3_

- [x] 15. 用户端最终 Checkpoint
  - 确保所有用户端功能测试通过，如有问题请询问用户。

---

## 用户端扩展功能（待实现）

- [x] 16. 预约扩展功能（用户端）
  - [x] 16.1 添加预约备注和人数字段
    - 更新 Appointment 数据模型添加 remark 和 peopleCount 字段
    - 更新 createAppointment 云函数支持备注和人数
    - 更新预约创建页面添加备注输入和人数选择
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 17. 会员扩展功能（用户端）
  - [ ] 17.1 添加会员来源归因字段
    - 更新 Member 数据模型添加 sourceChannel、referrerMemberId、salesStaffId、shopId 字段
    - 更新 registerMember 云函数支持来源参数
    - _Requirements: 11.2, 11.3_
  - [ ] 17.2 添加会员生日字段
    - 更新 Member 数据模型添加 birthday 字段
    - 更新会员注册和编辑页面支持生日输入
    - _Requirements: 14.1_
  - [ ] 17.3 实现扫码入会功能
    - 实现会员码扫描识别逻辑
    - 已注册用户跳转个人中心，未注册用户进入授权流程
    - _Requirements: 11.1, 11.2_

- [ ] 18. 卡项体系（用户端）
  - [ ] 18.1 创建卡项相关数据库集合
    - 创建 card_products 集合（卡产品定义）
    - 创建 member_cards 集合（会员持有卡实例）
    - 创建 card_transactions 集合（卡项流水）
    - _Requirements: 16.1, 16.2_
  - [ ] 18.2 实现卡项查询云函数（用户端）
    - 创建 listMemberCards 云函数（查询会员持有卡）
    - 创建 purchaseCard 云函数（会员购买卡）
    - _Requirements: 16.1, 16.2, 16.6_
  - [ ] 18.3 实现卡项有效期管理
    - 实现卡到期自动标记过期逻辑
    - 实现次卡用完自动标记 used_up 逻辑
    - _Requirements: 16.5_
  - [ ] 18.4 实现会员持卡信息页面
    - 创建 pages/member/cards 页面
    - 显示有效卡数、余额、余次和到期时间
    - _Requirements: 16.6_

- [ ] 19. 积分兑换（用户端）
  - [ ] 19.1 创建积分兑换相关数据库集合
    - 创建 points_products 集合（积分商品）
    - 创建 points_orders 集合（兑换订单）
    - _Requirements: 18.1_
  - [ ] 19.2 实现积分兑换云函数
    - 创建 listPointsProducts 云函数
    - 创建 redeemPointsProduct 云函数
    - 实现积分扣减和库存检查逻辑
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  - [ ] 19.3 实现积分商城页面
    - 创建 pages/points/mall 页面
    - 实现商品列表展示
    - 实现兑换流程
    - _Requirements: 18.1, 18.2_

- [ ] 20. 用户端扩展功能 Checkpoint
  - 确保所有用户端扩展功能测试通过，如有问题请询问用户。

---

## 管理端功能（移至管理端项目）

> ⚠️ 以下功能将在独立的管理端项目中实现，当前项目仅提供相关云函数接口支持。

### 已完成的云函数（供管理端调用）

- [x] createService 云函数（管理员创建服务）
- [x] updateService 云函数（管理员更新服务）
- [x] createTechnician 云函数（管理员创建技师）
- [x] updateTechnician 云函数（管理员更新技师信息）
- [x] updateTechnicianSchedule 云函数（设置技师排班）
- [x] updateTechnicianStatus 云函数（修改技师状态）
- [x] getAdminAppointments 云函数（管理员查询预约）
- [x] confirmArrival 云函数（确认到店）
- [x] completeService 云函数（完成服务）
- [x] sendAdminNotification 云函数（管理员通知）
- [x] scheduleReminders 云函数（定时发送预约提醒）

### 待实现的管理端页面（移至管理端项目）

- [ ] M1. 服务管理页面
  - 服务列表管理
  - 服务添加/编辑/下架功能
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] M2. 技师管理页面
  - 技师列表管理
  - 排班设置功能
  - 状态切换功能
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] M3. 预约管理页面
  - 预约列表展示（按日期/技师筛选）
  - 到店确认和完成服务操作
  - 按顾客信息模糊检索
  - _Requirements: 8.1, 8.2, 8.3, 13.1, 13.2, 13.3, 13.4_

- [ ] M4. 会员概览功能
  - 近期生日会员查询（未来7天、3天、今天）
  - 消费指标统计（消费次数、到店频次、累计消费）
  - 会员列表管理
  - _Requirements: 14.1, 14.2, 14.3_

- [ ] M5. 会员维护功能
  - 消费提醒功能
  - 生日触达功能（生日月折扣短信、生日当天祝福）
  - 触达记录查询
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] M6. 员工管理
  - 员工信息管理（添加、编辑、停用）
  - 提成计算功能（项目提成30%、卡项提成10%）
  - 员工考勤功能
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ] M7. 卡项管理（管理端）
  - 卡产品管理（创建、编辑、上下架）
  - 卡消费扣减操作
  - _Requirements: 16.3, 16.4_

---

## 备注

- 当前项目专注于用户端（C端）功能开发
- 管理端（B端）功能将在独立项目中实现
- 云函数作为共享后端服务，同时支持用户端和管理端调用
- 数据库集合和权限规则已在当前项目中配置完成
