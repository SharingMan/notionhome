# Notion 日历同步服务实施计划

## 概述
本项目旨在构建一个类似 `notion.cafe` 的服务，允许用户将他们的 Notion 数据库（特别是用作日历的数据库）与 Apple Calendar（或任何兼容 iCalendar 的客户端）同步。

核心功能包括：
1.  通过 OAuth 进行 Notion 认证。
2.  允许用户选择特定的 Notion 数据库。
3.  将数据库属性（名称、日期、描述）映射到日历事件字段。
4.  生成用户可以在 Apple Calendar 中订阅的持久性 `.ics` URL。
5.  提供反映 Notion 中实时动态变化的 `.ics` 内容。

## 技术栈
-   **前端/后端框架**: Next.js (React)
    -   使用 App Router 架构。
    -   API 路由用于 OAuth 回调和 `.ics` 生成。
-   **样式**: TailwindCSS (采用高级的玻璃拟态美学设计)。
-   **数据库**: 如果我们在 URL 中编码状态或使用无状态方法，MVP 阶段并不严格需要数据库。但为了更好的用户体验和安全性，我们可能通过 Prisma 使用轻量级数据库（SQLite 或 Postgres）来存储生成的 Feed ID 与用户 Notion Access Token + 数据库 ID 之间的映射关系。
-   **Notion 集成**: `@notionhq/client`
-   **日历生成**: `ics` (npm 包)
-   **部署**: Railway (提供 Dockerfile)。

## 架构与数据流

### 1. 用户引导 (前端)
-   **着陆页**: 美观、整洁的界面，解释产品价值。
-   **操作**: "连接 Notion" 按钮。
-   **流程**: 重定向到 Notion OAuth 授权 URL。

### 2. 认证 (后端)
-   **端点**: `/api/auth/notion/callback`
-   **操作**: 用授权码交换 Access Token。
-   **存储**: 临时存储 Token 或安全地传递给前端。

### 3. 配置 (前端)
-   **数据库选择**: 从 Notion 获取可访问的数据库列表。
-   **属性映射**: 用户选择哪些属性对应 "事件标题"、"开始/结束日期" 和 "描述"。
-   **生成**: 用户点击 "生成日历 URL"。

### 4. Feed 生成 (后端)
-   **操作**: 在数据库中创建一条记录：
    -   `id`: UUID (公开的 Feed ID)
    -   `accessToken`: 加密的 Notion Token
    -   `databaseId`: Notion 数据库 ID
    -   `mappings`: 定义属性映射的 JSON 对象。
-   **输出**: 唯一的 URL，例如 `https://api.myapp.com/feed/[uuid].ics`

### 5. 提供日历服务 (后端)
-   **端点**: `/api/feed/[id].ics`
-   **触发**: Apple Calendar 轮询此 URL (通常每 15-60 分钟)。
-   **流程**:
    1.  使用 `[id]` 检索 `accessToken` 和 `databaseId`。
    2.  查询 Notion API 获取数据库中的所有条目（过滤未来/最近的事件）。
    3.  使用保存的 `mappings` 将 Notion 页面转换为 iCalendar 事件。
    4.  返回 `text/calendar` 响应。

## 开发步骤

1.  **项目初始化**: 设置 Next.js 和 TailwindCSS。
2.  **数据库设置**: 配置 Prisma 和 SQLite (用于简单的本地开发) 或 Postgres (用于 Railway)。
3.  **核心逻辑实现**:
    -   Notion Client 封装。
    -   OAuth 流程。
    -   ICS 生成工具。
4.  **UI 实现**:
    -   着陆页。
    -   用于选择数据库和复制链接的仪表板。
5.  **部署配置**:
    -   Dockerfile。
    -   Railway 配置。

## 设计美学
-   **主题**: 极简、干净、"类 Notion" 风格但独具特色。
-   **颜色**: 黑、白、灰，搭配微妙的点缀色（例如 Notion 的橙色或沉稳的蓝色）。
-   **排版**: Inter 或类似的无衬线字体。
