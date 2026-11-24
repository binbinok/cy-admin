# 任务清单

## 1. 计数器与编号生成
- [x] 1.1 新增 `_shared/counter.js`：北京时间日切键、事务优先 + inc/get 回退的发号函数
- [x] 1.2 同步 `counter.js` 到 `adminCreateAppointment/_shared/`、`adminCreateMember/_shared/`
- [x] 1.3 `adminCreateAppointment` 接入每日预约号，移除随机生成与全量查重
- [x] 1.4 `adminCreateMember` 接入全局会员号（10001 起），移除随机生成与查重
- [x] 1.5 `initDatabaseIndexes` 更新索引提示（appointmentId 非唯一、counters 集合）

## 2. 前端修复（Bug，已先行完成）
- [x] 2.1 `DashboardPage.tsx` 服务项目/技师/备注三列字段修复
- [x] 2.2 lint + DashboardPage 测试通过

## 3. 提案
- [x] 3.1 `openspec validate update-numeric-id-rules --strict` 通过

## 4. 存量迁移
- [x] 4.1 核实线上 `appointments.appointmentId` 唯一索引并移除（`tcb db nosql execute` dropIndexes）
- [x] 4.2 编写一次性云函数 `tmpMigrateNumericIds`（dry-run 默认 + confirm 令牌 + 计数核对）
- [x] 4.3 注册 `cloudbaserc.json`（脚本修改 + git diff 核对）并部署函数
- [x] 4.4 dry-run 审查映射统计与重编号预览（34 会员→10001~10034 无冲突；6 预约 4 天）
- [x] 4.5 执行迁移，逐集合核对改写计数与计数器初值（10 集合 memberId 全部数字一致，含 commission_records null 语义澄清）
- [x] 4.6 创建测试会员/预约验证新编号（实测 10035 / 002），cleanup_test 清理并回退计数器（10034 / 1，无空洞）

## 5. 验证与收尾
- [x] 5.1 全量 lint + test 通过（52 文件 553 测试）
- [x] 5.2 删除一次性函数三处（云端 `tcb fn delete` + 本地目录 + cloudbaserc.json 还原）
- [x] 5.3 交付报告（部署清单、验证结果、前端重新发布提醒）
