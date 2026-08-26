# CloudBase 部署指南

## 环境信息
- **环境 ID**: `cloud1-1g7yz5w766dd366f`
- **CloudBase CLI**: v3.3.3
- **项目路径**: `D:\github\cy-admin`

---

## 部署步骤

### 1. 登录 CloudBase

```bash
tcb login
```

> 会弹出浏览器窗口进行腾讯云登录授权

### 2. 部署云函数

```bash
# 部署所有云函数
tcb fn deploy --all --envId cloud1-1g7yz5w766dd366f

# 或者部署单个函数
tcb fn deploy adminCreateMember --envId cloud1-1g7yz5w766dd366f
```

**注意**: 
- 首次部署需要创建函数，使用 `--force` 强制覆盖
- 云函数 runtime 为 `Nodejs18.15`，创建后不可更改
- 部署前确保 `cloudbaserc.json` 配置正确

### 3. 初始化数据库索引与服务模板

部署完成后，依次调用以下云函数完成初始化：

```bash
# 1. 通过 CloudBase 控制台或 SDK 调用
# 函数名: initDatabaseIndexes
# 参数: {}
# 说明: 记录需手动创建的索引（含 service_templates.categoryId、consumption_records.categoryId）

# 2. 初始化服务模板种子数据（幂等，已存在模板的分类自动跳过）
# 函数名: initServiceTemplates
# 参数: {}
# 说明: 写入六大类模板（美甲/美足/美睫/手护/脚护/修眉）及款式/附加项目种子
```

> 注意：`initServiceTemplates` 依赖 `service_categories` 中已存在的六大类分类
> （nail / foot-nail / lash / hand-care / foot-care / brow-shaping），
> 可先调用 `adminGetServiceCategories` 触发默认分类的幂等初始化。

### 4. 部署前端静态网站

```bash
# 构建前端（已配置 HashRouter 和相对路径）
npm run build

# 部署到静态网站托管
tcb hosting deploy dist -e cloud1-1g7yz5w766dd366f

# 或者部署到指定目录（推荐）
tcb hosting deploy dist ./cy-admin -e cloud1-1g7yz5w766dd366f
```

**部署后访问地址**: 
- 默认: `https://cloud1-1g7yz5w766dd366f-1394837822.ap-shanghai.app.tcloudbase.com`
- 自定义域名: 需在 CloudBase 控制台配置

---

## 配置文件说明

### vite.config.ts
- `base: './'` - 使用相对路径，适配静态托管
- 开发时代理 `/api/cloud` 到云函数（与生产 Nginx 反向代理路径一致）

### cloudbaserc.json
- 定义了 60+ 个云函数（含服务模板 CRUD 与统一结算入口 `adminCreateSettlement`）
- 所有函数使用 `Nodejs18.15` runtime
- JWT_SECRET 通过环境变量注入

### 服务模板与结算（三层架构）
- `service_templates` 集合替代旧 `services` 服务项体系（旧集合只读保留供历史数据兜底）
- 新增云函数：`adminGetServiceTemplates` / `adminCreateServiceTemplate` / `adminUpdateServiceTemplate` / `adminToggleServiceTemplateStatus` / `initServiceTemplates` / `adminCreateSettlement`
- 已废弃（返回迁移提示，不再写入 `services`）：`adminCreateService` / `adminUpdateService` / `adminToggleServiceStatus`
- `adminCreateIncomeRecord` 已废弃：前端收入录入改调 `adminCreateSettlement`，该函数保留一个版本周期后可从 `cloudbaserc.json` 移除
- 预约创建（`adminCreateAppointment`）入参由 `serviceId` 改为 `categoryId` + `duration`（默认取模板 `defaultDuration`）

### App.tsx
- 使用 `HashRouter` 替代 `BrowserRouter`
- 解决静态托管刷新 404 问题

---

## 常见问题

### 1. 云函数部署失败
```bash
# 检查函数配置
tcb fn list -e cloud1-1g7yz5w766dd366f

# 查看函数日志
tcb fn log adminCreateMember -e cloud1-1g7yz5w766dd366f
```

### 2. 前端资源加载失败
- 确保 `vite.config.ts` 中 `base: './'`
- 检查静态托管路径配置

### 3. API 调用失败
- 检查云函数是否正确部署
- 确认 `VITE_CLOUDBASE_HTTP_ORIGIN` 环境变量
- 验证 JWT 认证是否正常

---

## 完整部署脚本

```bash
#!/bin/bash
# deploy.sh

echo "=== 开始部署 cy-admin ==="

# 1. 构建前端
echo "[1/4] 构建前端..."
npm run build

# 2. 部署云函数
echo "[2/4] 部署云函数..."
tcb fn deploy --all --envId cloud1-1g7yz5w766dd366f --force

# 3. 初始化数据库索引
echo "[3/4] 初始化数据库索引..."
# 通过 SDK 或控制台调用 initDatabaseIndexes

# 4. 部署前端
echo "[4/4] 部署前端静态网站..."
tcb hosting deploy dist ./cy-admin -e cloud1-1g7yz5w766dd366f

echo "=== 部署完成 ==="
echo "访问地址: https://cloud1-1g7yz5w766dd366f-1394837822.ap-shanghai.app.tcloudbase.com/cy-admin"
```

---

## 安全建议

1. **JWT_SECRET**: 生产环境应使用强随机字符串，不要硬编码
2. **环境变量**: 敏感信息通过 CloudBase 控制台配置，不要提交到代码仓库
3. **访问控制**: 配置静态托管的访问权限
4. **HTTPS**: 确保使用 HTTPS 访问

---

## 相关文档

- [CloudBase CLI 文档](https://docs.cloudbase.net/cli/intro)
- [静态网站托管](https://docs.cloudbase.net/hosting/intro)
- [云函数部署](https://docs.cloudbase.net/functions/intro)
