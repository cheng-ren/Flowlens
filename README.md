# 财流镜 (Flowlens)

> 家庭消费账单自动采集与管理桌面应用，支持淘宝 / 天猫、京东多账户批量抓取订单详情，并通过本地 AI 自动归类。

---

## 功能特性

- **多平台支持**：同时管理淘宝（含天猫）和京东账号，一键批量采集订单
- **家庭多成员**：支持创建多个家庭，每个家庭下可添加多位成员，成员下绑定多个购物账号
- **自动授权**：内嵌悬浮浏览器，扫码/密码登录后自动提取并保存 Cookie，无需手动填写
- **订单详情抓取**：提取订单号、商品名称、数量、单价、收货信息、支付信息、物流公司等完整字段
- **AI 自动分类**：接入本地 [Ollama](https://ollama.com/) 大模型对商品名称进行分类（数码3C、服饰鞋包、食品生鲜等 17 大类），分类结果本地缓存
- **离线本地存储**：所有数据存入本机 SQLite，不上传任何隐私数据
- **跨平台构建**：支持 macOS（DMG）和 Windows（NSIS 安装包）

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Electron](https://www.electronjs.org/) 28 |
| 前端 | React 18 + TypeScript |
| 构建工具 | [electron-vite](https://electron-vite.org/) + Vite 5 |
| 数据库 | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)（本地 SQLite） |
| AI 分类 | [Ollama](https://ollama.com/) 本地推理（qwen3.5 模型） |
| 数据提取 | XPath + CSS Selector 注入脚本（webview executeJavaScript） |

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9
- （可选）[Ollama](https://ollama.com/) 已在本机运行，并已拉取 `qwen3.5` 模型（用于 AI 商品分类）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 打包构建

```bash
# macOS DMG
npm run build:mac

# Windows NSIS 安装包
npm run build:win

# 仅构建不打包
npm run build
```

---

## 使用指南

### 1. 初始化家庭

首次启动会弹出对话框，为你的第一个家庭或组织命名（如「我的家庭」）。

### 2. 添加成员

进入「设置」页面 → 成员管理 → **+ 添加成员**（例如：本人、配偶）。

### 3. 绑定购物账号

选择成员 → 账号管理 → **添加淘宝账号** 或 **添加京东账号**。

点击「授权」后，右下角弹出悬浮浏览器，在其中完成登录。登录成功后点击「✓ 完成授权」，系统自动识别并保存 Cookie。

### 4. 采集订单

切换到「账单」页面，点击「**获取所有账户最近3个月数据**」，系统将：

1. 依次遍历所有已授权账号
2. 自动翻页抓取订单列表
3. 逐条访问订单详情页提取完整字段
4. 调用本地 Ollama 对每件商品自动分类
5. 全部入库后弹出完成提示

---

## 数据库结构

数据文件位于系统 userData 目录下的 `clearledger.sqlite`：

| 表名 | 说明 |
|------|------|
| `families` | 家庭 / 组织 |
| `users` | 家庭成员 |
| `accounts` | 购物平台账号（含 Cookie） |
| `raw_orders` | 订单列表摘要（来自列表页） |
| `taobao_order_details` | 淘宝 / 天猫订单详情（含支付宝交易号、收货人、商品明细） |
| `jd_order_details` | 京东订单详情 |
| `category_cache` | AI 商品分类缓存（避免重复调用） |

---

## AI 分类配置

应用默认连接本机 `http://localhost:11434`，使用 `qwen3.5` 模型。

若未安装 Ollama 或模型不可用，商品分类将自动降级为「其他」，不影响订单采集。

```bash
# 安装 Ollama 后拉取模型
ollama pull qwen3.5
```

---

## 目录结构

```
src/
├── main/
│   ├── index.ts              # Electron 主进程：IPC 处理、数据库初始化、API 实现
│   └── browser-controller.ts # BrowserView 控制、Cookie 提取
├── preload/
│   └── index.ts              # 预加载脚本：暴露 window.api 给渲染进程
└── renderer/src/
    ├── App.tsx               # 根组件：路由、状态管理
    ├── hooks/
    │   └── useCapture.ts     # 采集核心逻辑（翻页、详情、重试）
    ├── config/
    │   ├── extractors.ts     # 淘宝 / 京东字段提取配置（XPath + Selector）
    │   └── scriptBuilder.ts  # 将配置编译为注入 webview 的 JS 脚本
    ├── constants/
    │   ├── scripts.ts        # 订单列表提取脚本
    │   └── detailScripts.ts  # 订单详情提取脚本（由 scriptBuilder 生成）
    └── components/
        ├── AppHeader.tsx
        ├── Dialog.tsx
        ├── dashboard/OrdersTable.tsx
        ├── settings/SettingsView.tsx
        └── webview/FloatWebviewPanel.tsx
```

---

## 注意事项

- 本应用通过 webview 内嵌浏览器以**用户身份**访问淘宝 / 京东，与正常手动浏览行为等同，请勿高频率采集以避免账号风控
- Cookie 数据仅存储在本机 SQLite，不会上传至任何服务器
- 目前支持淘宝买家订单页（`buyertrade.taobao.com`）和京东订单中心（`order.jd.com`）

---

## License

MIT
