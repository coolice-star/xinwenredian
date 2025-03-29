# 新闻热点抓取网站

一个简洁美观的热搜榜单网站，展示微博、知乎和百度等平台的热搜内容，并提供用户注册登录功能。

## 功能特点

- 美观大方的UI界面设计
- 用户注册和登录功能
- 展示微博、知乎和百度的热搜榜单
- 查看热搜详情内容的AI生成功能
- 响应式设计，支持移动设备浏览

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：Node.js, Express.js
- 数据存储：JSON文件（用户数据）
- 第三方API：免费开放的热搜API

## 本地开发

### 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 返回项目根目录
cd ..
```

### 启动服务器

```bash
# 启动方式1：使用批处理文件（仅Windows）
start-server.bat

# 启动方式2：直接启动Node.js服务器
cd server
npm start
```

### 访问网站

启动服务器后，打开浏览器访问：`http://localhost:3000`

## 部署指南

### 使用Render部署

1. 在[Render](https://render.com/)上注册账户

2. 创建一个新的Web Service

3. 连接你的GitHub/GitLab存储库或上传源代码

4. 配置设置:
   - 名称：选择一个应用名称
   - 环境：Node
   - 构建命令：`cd server && npm install`
   - 启动命令：`cd server && node server.js`
   - 计划类型：选择免费计划

5. 点击"Create Web Service"创建服务

6. 部署完成后，您可以通过提供的URL访问您的网站

### 手动配置文件

部署前确保以下配置文件正确设置：

- `server/package.json`: 包含正确的依赖和启动脚本
- `server/Procfile`: 为云平台提供的启动命令文件
- `.gitignore`: 排除不需要上传的文件和目录
- `server/server.js`: 配置正确的CORS设置和端口

## 注意事项

1. 本项目使用基于文件的简单数据存储（`server/users.json`）。在生产环境中，建议使用更稳定的数据库解决方案，如MongoDB或PostgreSQL。

2. 在部署到云平台后，需要将前端代码中的API地址更新为云平台URL。

3. 免费的云平台可能有资源限制和空闲休眠策略，对此需要有所了解。 