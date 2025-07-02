# Leek Web

量化交易管理系统 - 前端界面

## 功能特性

- 用户登录认证
- 项目管理
- 策略管理
- 数据源管理
- 执行器管理
- 仓位管理
- 信号监控
- 订单管理
- 风险管理
- 用户权限管理

## 技术栈

- Vue 3
- Vue Router
- Axios
- SCSS
- Vite

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
leek-web/
├── public/           # 静态资源
├── src/
│   ├── api/         # API 接口
│   ├── components/  # 公共组件
│   ├── router/      # 路由配置
│   ├── styles/      # 样式文件
│   ├── utils/       # 工具函数
│   ├── views/       # 页面组件
│   ├── App.vue      # 根组件
│   └── main.js      # 入口文件
├── index.html       # HTML 模板
└── vite.config.js   # Vite 配置
```

## 开发指南

### 环境变量

创建 `.env` 文件配置 API 地址：

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 Vue 3 组合式 API 规范
- 组件命名采用 PascalCase
- 文件命名采用 kebab-case

## 部署

### 构建部署

```bash
# 构建生产版本
npm run build

# 部署 dist 目录到 Web 服务器
```

### Docker 部署

```dockerfile
FROM nginx:alpine

# 复制构建文件
COPY dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 联系方式

- 讨论组：<a href="https://t.me/+lFHR-vTZ6Y1iZTU1">Telegram</a>
- 项目地址：https://github.com/shenglin-li/leek 