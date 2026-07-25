# 云函数调整方案设计

## 变更概述

本方案对应 OpenSpec 提案 `add-appointment-creation-and-finance-export`，涉及云函数的新增、修改和数据库结构扩展。

## 1. 数据库结构变更

### 1.1 consumption_records 集合扩展

**新增字段**：`paymentDetails`（支付方式明细数组）

```javascript
// 示例文档结构
{
  _id: "xxx",
  memberId: "member_001",
  amount: 15000,           // 实付总金额（分）
  originalAmount: 20000,   // 原价（分）
  discountAmount: 5000,    // 折扣金额（分）
  pointsEarned: 1500,
  serviceCategory: "美甲",
  serviceName: "基础护理",
  technicianId: "tech_001",
  technicianName: "张技师",
  serviceTime: ISODate("2026-05-08T14:30:00Z"),
  note: "",
  source: "manual",
  // 新增字段
  paymentDetails: [        // 支付方式明细
    {
      paymentType: "cash",     // 金额类型：member_card/cash/meituan
      amount: 10000,           // 该支付方式金额（分）
      createdAt: ISODate("2026-05-08T14:30:00Z")
    },
    {
      paymentType: "member_card",
      amount: 5000,
      createdAt: ISODate("2026-05-08T14:30:00Z")
    }
  ],
  createdAt: ISODate("2026-05-08T14:30:00Z"),
  updatedAt: ISODate("2026-05-08T14:30:00Z")
}
```

**paymentType 枚举值**：
- `member_card` - 会员卡
- `cash` - 现金
- `meituan` - 美团

### 1.2 appointments 集合确认

现有字段已满足需求，无需变更：
```javascript
{
  _id: "xxx",
  appointmentId: "apt_001",
  memberId: "member_001",
  memberName: "张三",
  memberPhone: "138****8888",
  serviceId: "svc_001",
  serviceName: "基础美甲",
  technicianId: "tech_001",
  technicianName: "张技师",
  appointmentDate: "2026-05-10",
  appointmentTime: "14:30",
  status: "pending",       // pending/serving/completed/cancelled
  note: "",
  createdAt: ISODate("2026-05-08T10:00:00Z"),
  updatedAt: ISODate("2026-05-08T10:00:00Z")
}
```

### 1.3 索引建议

**consumption_records 集合**：
```javascript
// 技师ID + 创建时间（用于业绩统计和明细查询）
db.collection('consumption_records').createIndex({ technicianId: 1, createdAt: -1 })

// 支付方式类型（用于财务分类统计）
db.collection('consumption_records').createIndex({ "paymentDetails.paymentType": 1 })
```

**appointments 集合**：
```javascript
// 技师ID + 预约日期（用于时间冲突校验）
db.collection('appointments').createIndex({ technicianId: 1, appointmentDate: 1 })
```

---

## 2. 新增云函数

### 2.1 adminCreateAppointment（预约创建）

**功能**：管理员在后台直接创建预约订单

**入参**：
```javascript
{
  memberId: "member_001",        // 会员ID（必填）
  serviceId: "svc_001",          // 服务项目ID（必填）
  technicianId: "tech_001",      // 技师ID（必填）
  appointmentDate: "2026-05-10", // 预约日期 YYYY-MM-DD（必填）
  appointmentTime: "14:30",      // 预约时间 HH:mm（必填）
  note: "",                      // 备注（可选）
}
```

**出参**：
```javascript
{
  success: true,
  data: {
    appointmentId: "apt_001",
    status: "pending",
    message: "预约创建成功"
  }
}
```

**业务逻辑**：
1. 验证必填字段（memberId, serviceId, technicianId, appointmentDate, appointmentTime）
2. 验证会员是否存在
3. 验证服务项目是否存在且上架
4. 验证技师是否存在且在职
5. **时间冲突校验**：
   - 查询该技师在预约日期的所有预约
   - 检查时间段是否重叠（考虑服务时长）
   - 若冲突，返回错误："该时间段技师已被预约"
6. 创建预约记录，状态为 `pending`
7. 记录操作日志

**时间冲突校验算法**：
```javascript
// 获取技师当日所有预约
const existingAppointments = await db.collection('appointments')
  .where({
    technicianId,
    appointmentDate,
    status: _.nin(['cancelled'])
  })
  .get();

// 检查时间段重叠
const newStart = parseTime(appointmentTime);
const newEnd = newStart + serviceDuration; // 服务时长（分钟）

for (const apt of existingAppointments.data) {
  const existStart = parseTime(apt.appointmentTime);
  const existEnd = existStart + apt.serviceDuration;
  
  // 重叠判断：(StartA < EndB) && (EndA > StartB)
  if (newStart < existEnd && newEnd > existStart) {
    return error(AdminErrorCode.CONFLICT, '该时间段技师已被预约');
  }
}
```

---

### 2.2 adminExportPayroll（工资条导出）

**功能**：导出指定技师指定月份的工资条（CSV格式）

**入参**：
```javascript
{
  technicianId: "tech_001",  // 技师ID（必填）
  month: "2026-05"           // 月份 YYYY-MM（必填）
}
```

**出参**：
```javascript
{
  success: true,
  data: {
    content: "技师姓名,统计月份,完成订单数,服务总金额,应得提成金额\n张技师,2026-05,15,35000,10500",
    filename: "payroll_tech_001_2026-05.csv",
    contentType: "text/csv;charset=utf-8;"
  }
}
```

**业务逻辑**：
1. 验证必填字段（technicianId, month）
2. 解析月份范围（startDate = 月初, endDate = 月末）
3. 查询技师信息确认存在
4. 查询该技师在月份范围内的消费记录
5. 计算统计指标：
   - 完成订单数 = 消费记录数量
   - 服务总金额 = 所有消费记录 amount 之和
   - 应得提成金额 = 服务总金额 × 技师提成比例
6. 生成 CSV 内容（含 BOM 头解决中文乱码）
7. 返回 CSV 数据和文件名

**CSV 格式**：
```csv
技师姓名,统计月份,完成订单数,服务总金额(元),应得提成金额(元)
张技师,2026-05,15,350.00,105.00
```

**注意**：金额从分转换为元展示，保留两位小数

---

### 2.3 adminGetTechnicianIncomeDetail（技师业绩明细）

**功能**：查询指定技师的业务记录明细列表

**入参**：
```javascript
{
  technicianId: "tech_001",     // 技师ID（必填）
  startDate: "2026-05-01",      // 开始日期 YYYY-MM-DD（可选，默认当月）
  endDate: "2026-05-31",        // 结束日期 YYYY-MM-DD（可选，默认当月）
  page: 1,                      // 页码（可选，默认1）
  pageSize: 20                  // 每页条数（可选，默认20，最大100）
}
```

**出参**：
```javascript
{
  success: true,
  data: {
    list: [
      {
        _id: "record_001",
        serviceTime: "2026-05-08T14:30:00Z",
        serviceName: "基础美甲",
        paymentDetails: [
          { paymentType: "cash", amount: 10000 },
          { paymentType: "member_card", amount: 5000 }
        ],
        totalAmount: 15000,       // 实付总金额
        memberName: "张三",
        note: ""
      }
    ],
    total: 45,
    summary: {
      totalAmount: 450000,       // 期间总金额（分）
      orderCount: 45             // 期间总单数
    }
  }
}
```

**业务逻辑**：
1. 验证必填字段（technicianId）
2. 设置默认日期范围（当月）
3. 查询消费记录（按创建时间倒序）
4. 关联会员信息（获取 memberName）
5. 计算汇总数据（总金额、总单数）
6. 分页返回

**金额展示**：返回分单位，前端转换为元展示

---

## 3. 修改云函数

### 3.1 adminCreateIncomeRecord（收入录入）

**变更点**：支持多支付方式录入

**原入参**：
```javascript
{
  serviceCategory: "美甲",
  serviceName: "基础护理",
  serviceFee: 20000,       // 服务费用（分）
  serviceTime: "2026-05-08T14:30:00Z",
  technicianId: "tech_001",
  memberId: "member_001",
  note: ""
}
```

**新入参**（向后兼容）：
```javascript
{
  serviceCategory: "美甲",
  serviceName: "基础护理",
  serviceTime: "2026-05-08T14:30:00Z",
  technicianId: "tech_001",
  memberId: "member_001",
  note: "",
  // 新字段：支付方式明细（必填，替代原 serviceFee）
  paymentDetails: [
    {
      paymentType: "cash",      // 金额类型：member_card/cash/meituan
      amount: 15000             // 费用金额（分）
    },
    {
      paymentType: "member_card",
      amount: 5000
    }
  ]
}
```

**兼容性处理**：
- 若传入 `paymentDetails`，使用新逻辑
- 若未传入 `paymentDetails` 但传入 `serviceFee`，使用旧逻辑（单条 cash 类型记录）

**业务逻辑变更**：

1. **验证支付方式明细**：
```javascript
// 验证 paymentDetails
if (!Array.isArray(event.paymentDetails) || event.paymentDetails.length === 0) {
  return error(AdminErrorCode.VALIDATION_ERROR, '至少填写一组支付方式');
}

if (event.paymentDetails.length > 3) {
  return error(AdminErrorCode.VALIDATION_ERROR, '支付方式最多3组');
}

const validPaymentTypes = ['member_card', 'cash', 'meituan'];
const usedTypes = new Set();
let totalFee = 0;

for (const detail of event.paymentDetails) {
  const type = String(detail.paymentType || '').trim();
  const amount = Number(detail.amount);
  
  if (!validPaymentTypes.includes(type)) {
    return error(AdminErrorCode.VALIDATION_ERROR, `无效的金额类型: ${type}`);
  }
  
  if (usedTypes.has(type)) {
    return error(AdminErrorCode.VALIDATION_ERROR, `金额类型 ${type} 重复`);
  }
  usedTypes.add(type);
  
  if (!Number.isInteger(amount) || amount <= 0) {
    return error(AdminErrorCode.VALIDATION_ERROR, '费用金额必须大于0');
  }
  
  totalFee += amount;
}
```

2. **计算折扣和积分**（基于 totalFee）：
```javascript
const { memberDoc, discountRate } = await getMemberBenefit(memberId);
const originalAmount = totalFee;
const amount = Math.floor(totalFee * discountRate / 100);
const discountAmount = originalAmount - amount;
const pointsEarned = amount === 0 ? 0 : Math.floor(amount / 10);
```

3. **存储支付方式明细**：
```javascript
const consumptionRecord = {
  memberId: memberId || '',
  amount,
  originalAmount,
  discountAmount,
  pointsEarned,
  serviceCategory: category.name,
  serviceName,
  technicianId,
  technicianName: technicianDoc.name || '',
  serviceTime,
  note,
  source: 'manual',
  // 新增字段
  paymentDetails: event.paymentDetails.map(d => ({
    paymentType: d.paymentType,
    amount: d.amount,
    createdAt: now
  })),
  createdAt: now,
  updatedAt: now,
};
```

4. **财务统计适配**：
   - `adminGetFinanceSummary` - 无需修改，仍按 `amount` 字段统计
   - `adminGetServiceRevenue` - 如需按支付方式分类统计，需新增聚合逻辑
   - `adminGetRevenueTrend` - 无需修改

---

### 3.2 adminGetTechnicianPerformance（技师业绩统计）

**变更点**：返回结构增加 technicianId，便于前端点击查看明细

**原出参**：
```javascript
{
  technicianId: "tech_001",
  technicianName: "张技师",
  orderCount: 15,
  totalAmount: 35000
}
```

**新出参**（保持兼容，增加字段）：
```javascript
{
  technicianId: "tech_001",      // 已存在
  technicianName: "张技师",       // 已存在
  orderCount: 15,                // 已存在
  totalAmount: 35000,            // 已存在
  commissionRate: 30,            // 新增：提成比例
  commissionAmount: 10500        // 新增：应得提成金额
}
```

**业务逻辑变更**：
1. 查询技师信息获取提成比例
2. 计算应得提成金额 = totalAmount × commissionRate / 100

---

## 4. 云函数清单

### 4.1 新增云函数

| 云函数名 | 功能 | 复杂度 | 依赖 |
|---------|------|--------|------|
| `adminCreateAppointment` | 预约创建（含时间冲突校验） | 中 | appointments, services, technicians, members |
| `adminExportPayroll` | 工资条导出（CSV） | 低 | consumption_records, technicians |
| `adminGetTechnicianIncomeDetail` | 技师业绩明细查询 | 低 | consumption_records, members |

### 4.2 修改云函数

| 云函数名 | 变更内容 | 影响范围 |
|---------|---------|---------|
| `adminCreateIncomeRecord` | 支持多支付方式（paymentDetails字段） | 财务统计、消费记录 |
| `adminGetTechnicianPerformance` | 增加提成比例和提成金额字段 | 技师业绩页面 |

### 4.3 无需修改的云函数

| 云函数名 | 原因 |
|---------|------|
| `adminGetFinanceSummary` | 仍按 amount 字段统计，不受支付方式明细影响 |
| `adminGetRevenueTrend` | 同上 |
| `adminGetConsumptionList` | 查询逻辑不变，paymentDetails 作为扩展字段返回 |
| `adminGetAppointmentList` | 查询逻辑不变 |

---

## 5. 前端服务层适配

### 5.1 新增 API 调用

```typescript
// src/services/appointment.ts
export const createAppointment = (data: CreateAppointmentParams) =>
  http.post('/invoke/adminCreateAppointment', data);

// src/services/finance.ts
export const exportPayroll = (params: ExportPayrollParams) =>
  http.post('/invoke/adminExportPayroll', params);

export const getTechnicianIncomeDetail = (params: TechnicianIncomeDetailParams) =>
  http.post('/invoke/adminGetTechnicianIncomeDetail', params);
```

### 5.2 修改 API 调用

```typescript
// src/services/finance.ts
export const createIncomeRecord = (data: CreateIncomeRecordParams) =>
  http.post('/invoke/adminCreateIncomeRecord', {
    ...data,
    paymentDetails: data.paymentDetails // 新增字段
  });
```

---

## 6. 实施顺序建议

### 第一阶段：数据库和基础设施
1. 为 `consumption_records` 添加 `paymentDetails` 字段（已有文档无需迁移，新文档自动包含）
2. 创建必要的数据库索引

### 第二阶段：云函数开发
1. **adminCreateAppointment** - 预约创建（最复杂，需时间冲突校验）
2. **adminCreateIncomeRecord** - 收入录入改造（多支付方式支持）
3. **adminExportPayroll** - 工资条导出
4. **adminGetTechnicianIncomeDetail** - 技师业绩明细

### 第三阶段：前端适配
1. 会员管理 - 新增会员弹窗
2. 预约订单 - 新增预约弹窗
3. 财务统计 - 收入录入表单改造
4. 财务统计 - 工资条导出功能
5. 技师业绩 - 明细查看功能

### 第四阶段：测试验证
1. 单元测试：时间冲突校验、多支付方式计算
2. 集成测试：端到端流程验证
3. 回归测试：确保现有功能不受影响

---

## 7. 风险与注意事项

### 7.1 数据一致性
- **收入录入改造**：旧数据（无 paymentDetails）与新数据共存，查询时需兼容处理
- **建议**：在 `adminGetConsumptionList` 中，对无 paymentDetails 的旧数据，自动构造单条 cash 类型的 paymentDetails

### 7.2 时间冲突校验精度
- 预约时间精确到分钟（HH:mm）
- 服务时长从服务项目表中获取（duration 字段，单位：分钟）
- 需考虑技师排班时间限制（未来可扩展）

### 7.3 CSV 导出中文乱码
- 需在 CSV 内容前添加 BOM 头（`\uFEFF`）
- 或使用 UTF-8 with BOM 编码

### 7.4 性能考虑
- 技师业绩明细查询需分页（page/pageSize）
- 大月份数据量可能较大，建议限制单次查询最大条数（100条）

---

## 8. 验证清单

### 8.1 云函数验证
- [ ] adminCreateAppointment：时间冲突校验正确
- [ ] adminCreateAppointment：必填字段验证完整
- [ ] adminCreateIncomeRecord：单支付方式（向后兼容）
- [ ] adminCreateIncomeRecord：多支付方式（2-3组）
- [ ] adminCreateIncomeRecord：金额类型重复校验
- [ ] adminExportPayroll：CSV 格式正确
- [ ] adminExportPayroll：中文无乱码
- [ ] adminGetTechnicianIncomeDetail：分页正确
- [ ] adminGetTechnicianIncomeDetail：汇总数据准确

### 8.2 前端验证
- [ ] 新增会员弹窗：字段校验正确
- [ ] 新增预约弹窗：技师/服务/时间选择正常
- [ ] 收入录入：金额类型禁用逻辑正确
- [ ] 收入录入：费用组增删逻辑正确
- [ ] 工资条导出：下载文件内容正确
- [ ] 技师业绩明细：列表展示正确

---

**方案设计完成，等待确认后开始实施。**
