<div align="center">

# ThinkLingo — 跨语言推理

**多语言 LLM 对话应用，通过将输入翻译为指定的处理语言（默认英语）后再进行推理，从而标准化推理质量。**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[报告问题](https://github.com/Sun-Yize/ThinkLingo/issues) · [功能建议](https://github.com/Sun-Yize/ThinkLingo/issues)

[English](README.md) | **中文**

</div>

![ThinkLingo UI](assets/img01.png)

> [!Important]
> ThinkLingo 已正式上线！访问 [thinklingo.yizesun.com](https://thinklingo.yizesun.com) 即可体验，无需部署。

---

## 为什么选择 ThinkLingo？

大语言模型在使用特定语言（尤其是英语）进行推理时，往往能产生更优质的结果。ThinkLingo 会自动将你的输入翻译为更强的处理语言（默认英语）后再交由 LLM 推理，然后将答案翻译回你的语言，让你无论使用何种语言都能获得顶级的推理质量。

```
你的消息（任意语言）
  → [1] 翻译为处理语言（默认英语，可配置）
  → [2] LLM 以处理语言进行推理
  → [3] 将回答翻译回你的语言
  → 实时流式输出到屏幕
```

双栏 UI 同时展示两侧内容——处理语言的推理过程和你的母语翻译——让你始终了解推理的全过程。

**支持语言：** English · 中文 · 日本語 · 한국어

---

## 功能特性

- **双 LLM 架构** — 推理和翻译分别使用不同模型，支持 5 家提供商任意组合
- **实时流式传输** — 基于 WebSocket 的逐 token 流式传输，支持段落级并发翻译
- **智能提示路由** — 自动分类用户意图并应用专业系统提示（代码调试、数学求解、创意写作等）
- **思维链展示** — 可折叠的思考过程区块，适配推理模型（DeepSeek-R1、Qwen 思考模型）
- **多会话管理** — 持久化聊天历史，LLM 自动生成标题，支持中途切换会话
- **会话级 API 密钥** — 用户可通过 UI 提供自己的密钥，无需服务端配置
- **安全与限流** — Token 认证、动态会话、IP 级配额、WebSocket 并发限制
- **响应式设计** — 桌面端双栏布局，移动端标签切换

---

## 快速开始

### 方案一 — Docker（推荐）

**前置条件：** [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
docker-compose up -d
```

打开 **http://localhost:3000** — 首次访问时 UI 会引导你配置 API 密钥。

**常用命令**

```bash
docker-compose logs -f          # 查看日志
docker-compose down             # 停止服务
docker-compose up -d --build    # 代码更改后重新构建
```

---

### 方案二 — 命令行

**前置条件：** Python 3.11+、Node.js 18+。

**1. 克隆并配置**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

**2. 一键启动**

```bash
bash start.sh
```

`start.sh` 会安装所有依赖（首次运行时），在端口 8000 启动后端，在端口 3000 启动前端。按 `Ctrl+C` 停止所有服务。

<details>
<summary>手动启动（不使用脚本）</summary>

```bash
# 终端 1 — 后端
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000

# 终端 2 — 前端
cd frontend
npm install
npm start
```

</details>

打开 **http://localhost:3000** — 完成。

---

## 支持的 LLM 提供商

ThinkLingo 采用 **双 LLM 设计** — 一个模型负责推理，另一个负责翻译。你可以任意组合：

| 提供商 | 推理模型 | 翻译模型 | API 密钥环境变量 |
|---|---|---|---|
| DeepSeek | `deepseek-chat`、`deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`、`gpt-4o-mini`、`o3-mini` | `gpt-3.5-turbo`、`gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`、`claude-sonnet-4-5` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`、`gemini-2.5-pro` | `gemini-2.5-flash`、`gemini-2.5-flash-lite` | `GOOGLE_API_KEY` |
| 阿里巴巴（通义千问） | `qwen-plus`、`qwen3-max`、`qwen3-max-thinking` | `qwen-turbo`、`qwen-plus` | `QWEN_API_KEY` |

用户也可以在前端界面中为当前会话提供自己的 API 密钥（需设置 `ALLOW_USER_API_KEYS=true`）。

---

## 配置说明

所有配置项均在 `.env` 文件中（从 `.env.template` 复制）：

```bash
# ── API 密钥（至少需要一个）─────────────────────────
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...       # 同时支持 ANTHROPIC_AUTH_TOKEN（OAuth 认证）
GOOGLE_API_KEY=...
QWEN_API_KEY=...

# ── 提供商选择 ──────────────────────────────────────
# 支持: deepseek | openai | claude | gemini | qwen
DEFAULT_LLM_PROVIDER=deepseek       # 推理模型
TRANSLATION_LLM_PROVIDER=openai     # 翻译模型

# ── 模型名称 ────────────────────────────────────────
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
CLAUDE_MODEL=claude-opus-4-6
GEMINI_MODEL=gemini-3.1-pro-preview
QWEN_MODEL=qwen-plus

# ── 运行时配置 ──────────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # 阻塞式 LLM 调用的线程池大小

# ── 安全设置 ────────────────────────────────────────
ALLOW_USER_API_KEYS=true     # 允许用户通过 UI 提供自己的密钥
# AUTH_TOKEN=...             # 保护所有端点（Bearer Token）
SESSION_TTL_SECONDS=3600     # 动态会话令牌有效期
MAX_SESSIONS_PER_IP_PER_HOUR=0   # 0 = 不限制
DAILY_MESSAGE_QUOTA_PER_IP=0     # 0 = 不限制

# ── WebSocket 限制 ─────────────────────────────────
MAX_WS_CONNECTIONS=200
MAX_WS_CONNECTIONS_PER_IP=5
WS_RATE_LIMIT_PER_SEC=5

# ── CORS ────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ── 通义千问区域端点（可选）────────────────────────
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

**费用提示：** 默认的双 LLM 配置（DeepSeek 推理 + GPT-4o-mini 翻译）在最大化质量的同时最小化成本。如果你只有一个 API 密钥，可以将两个提供商设置为相同的值。

完整配置选项及注释请参考 `.env.template`。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18、TypeScript、Tailwind CSS |
| 后端 | FastAPI、Python 3.11、uvicorn |
| 流式传输 | WebSocket（实时 token 流式传输） |
| LLM 提供商 | DeepSeek、OpenAI、Anthropic/Claude、Google/Gemini、阿里巴巴/通义千问 |
| 反向代理 | nginx |
| 部署 | Docker + Docker Compose |

---

## 项目结构

```
ThinkLingo/
├── backend/
│   ├── app.py                           # FastAPI 入口 + WebSocket + 认证 + 限流
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 四步流水线协调器
│   ├── agents/
│   │   ├── translator_agent.py          # 语言检测与翻译（代码块保护）
│   │   └── questioner_agent.py          # 处理语言推理（5 种回复类型）
│   ├── llms/
│   │   ├── base.py                      # 抽象 LLM 接口
│   │   ├── deepseek_llm.py             # DeepSeek（支持思维链）
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py               # API 密钥 + OAuth 双重认证
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py                 # 区域端点 + 思考模型
│   ├── prompt_router/
│   │   ├── models.py                    # PromptTemplate 数据类
│   │   ├── registry.py                  # 从 JSON 加载 15+ 模板
│   │   ├── router.py                    # 基于 LLM 的意图分类
│   │   └── templates.json               # 专业提示模板
│   └── utils/
│       ├── config.py                    # 类型化配置加载器 + 验证
│       ├── llm_factory.py              # LLM 工厂（服务端 + 按请求创建）
│       └── language_config.py           # 支持的语言列表
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TranslationChat.tsx      # 主编排器（WebSocket、状态、流式传输）
│   │   │   ├── DualColumnView.tsx       # 响应式双栏布局
│   │   │   ├── TurnRow.tsx              # 会话轮次（思考 + 路由区块）
│   │   │   ├── MessageBubble.tsx        # 消息渲染器（Markdown、代码复制）
│   │   │   ├── InputBar.tsx             # 输入文本框（支持 IME）
│   │   │   ├── ChatHistory.tsx          # 侧边栏会话管理器
│   │   │   ├── SettingsModal.tsx        # 语言、回复类型、路由开关
│   │   │   └── ApiConfigModal.tsx       # 按角色配置 LLM 提供商/模型/密钥
│   │   ├── types/chat.ts               # TypeScript 接口
│   │   └── utils/i18n.ts               # UI 翻译（英/中/日/韩）
│   ├── Dockerfile                       # 多阶段构建（Node → nginx）
│   ├── nginx-frontend.conf              # 内部 nginx SPA 路由配置
│   └── tailwind.config.js               # 自定义 void 主题 + 毛玻璃效果
├── nginx/
│   ├── nginx-local.conf                 # 本地 Docker 配置（HTTP）
│   └── nginx.conf                       # 生产环境配置（HTTPS + 限流）
├── tools/
│   └── bench_qwen.py                   # 通义千问模型基准测试工具
├── start.sh                             # 一键本地启动脚本
├── docker-compose.yml                   # 本地部署
├── docker-compose.prod.yml              # 生产环境覆盖配置（HTTPS、子路径）
├── Dockerfile                           # 后端镜像（python:3.11-slim）
└── .env.template                        # 配置模板
```

---

## API 端点

### REST

| 端点 | 方法 | 描述 |
|---|---|---|
| `/api/health` | GET | 健康检查与编排器状态 |
| `/api/languages` | GET | 获取支持的语言列表 |
| `/api/response-types` | GET | 获取回复类型列表（通用、创意、分析、教育、技术） |
| `/api/session` | POST | 创建短期会话令牌（按 IP 限流） |
| `/api/quota` | GET | 获取当前 IP 的每日消息剩余配额 |
| `/api/config` | GET | 功能标志和可用的服务端配置提供商 |
| `/api/generate-title` | POST | 根据首条消息生成会话标题 |

### WebSocket

| 端点 | 协议 | 描述 |
|---|---|---|
| `/ws/chat` | WebSocket | 四步工作流的流式对话，支持提示路由和思维链展示 |

---

## 扩展开发

- **新增 LLM 提供商** — 继承 `backend/llms/base.py`，注册到 `backend/utils/llm_factory.py`，添加到 `Config` 和前端 `ApiConfigModal.tsx`
- **新增语言** — 更新 `backend/utils/language_config.py`、agent 提示词和 `frontend/src/utils/i18n.ts`
- **新增回复类型** — 更新 `backend/agents/questioner_agent.py` 和 `frontend/src/utils/i18n.ts`
- **新增提示模板** — 在 `backend/prompt_router/templates.json` 中添加条目

---

## 许可证

[AGPL-3.0](LICENSE)
