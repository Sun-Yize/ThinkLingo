<div align="center">

# ThinkLingo — 言語横断推論

**入力を指定の処理言語（デフォルト：英語）に翻訳してから推論を行うことで、推論品質を標準化する多言語LLMチャットアプリ。**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[English](README.md) | [中文](README_CN.md) | **日本語** | [한국어](README_KO.md)

</div>

> [!Important]
> ThinkLingoが公開されました！[thinklingo.yizesun.com](https://thinklingo.yizesun.com) で今すぐ体験できます。セットアップ不要です。

![ThinkLingo UI](assets/img01.png)

---

## なぜThinkLingo？

大規模言語モデル（LLM）は、特定の言語——特に英語——で推論する際に、より優れた結果を出すことが知られています。ThinkLingoは入力を自動的により強力な処理言語（デフォルト：英語）に翻訳してからLLMに推論させ、回答をあなたの言語に翻訳して返します。どの言語を使っても最高品質の推論が得られます。

```
あなたのメッセージ（任意の言語）
  → [1] 処理言語に翻訳（デフォルト：英語、変更可能）
  → [2] LLMが処理言語で推論
  → [3] 回答をあなたの言語に翻訳
  → リアルタイムでストリーミング表示
```

2カラムUIで両側を同時に表示——処理言語での推論過程とあなたの母語での翻訳——推論の全プロセスが一目でわかります。

**対応言語：** English · 中文 · 日本語 · 한국어

---

## 機能

- **デュアルLLMアーキテクチャ** — 推論と翻訳にそれぞれ別のモデルを使用、5社のプロバイダーを自由に組み合わせ可能
- **リアルタイムストリーミング** — WebSocketベースのトークン単位ストリーミング、段落レベルの並行翻訳対応
- **スマートプロンプトルーティング** — ユーザーの意図を自動分類し、専門的なシステムプロンプトを適用（コードデバッグ、数学ソルバー、クリエイティブライティングなど）
- **思考連鎖表示** — 折りたたみ可能な思考プロセスブロック、推論モデル対応（DeepSeek-R1、Qwen思考モデル）
- **マルチ会話管理** — 永続的なチャット履歴、LLMによるタイトル自動生成、途中切り替え可能
- **セッション単位のAPIキー** — UIから自分のキーを入力可能、サーバー設定不要
- **セキュリティと流量制限** — トークン認証、動的セッション、IP単位のクォータ、WebSocket同時接続制限
- **レスポンシブデザイン** — デスクトップで2カラム表示、モバイルでタブ切り替え

---

## クイックスタート

### オプションA — Docker（推奨）

**前提条件：** [Docker](https://docs.docker.com/get-docker/) と [Docker Compose](https://docs.docker.com/compose/install/)。

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
docker-compose up -d
```

**http://localhost:3000** を開きます——初回アクセス時にUIがAPIキーの設定をガイドします。

**よく使うコマンド**

```bash
docker-compose logs -f          # ログを表示
docker-compose down             # 停止
docker-compose up -d --build    # コード変更後に再ビルド
```

---

### オプションB — コマンドライン

**前提条件：** Python 3.11以上、Node.js 18以上。

**1. クローンして設定**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

**2. ワンコマンドで起動**

```bash
bash start.sh
```

`start.sh` はすべての依存関係をインストールし（初回実行時）、バックエンドをポート8000、フロントエンドをポート3000で起動します。`Ctrl+C` で停止します。

<details>
<summary>手動起動（スクリプトを使わない場合）</summary>

```bash
# ターミナル1 — バックエンド
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000

# ターミナル2 — フロントエンド
cd frontend
npm install
npm start
```

</details>

**http://localhost:3000** を開きます——完了です。

---

## 対応LLMプロバイダー

ThinkLingoは**デュアルLLM設計**を採用——推論用モデルと翻訳用モデルを自由に組み合わせ可能です：

| プロバイダー | 推論モデル | 翻訳モデル | APIキー環境変数 |
|---|---|---|---|
| DeepSeek | `deepseek-chat`、`deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`、`gpt-4o-mini`、`o3-mini` | `gpt-3.5-turbo`、`gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`、`claude-sonnet-4-5` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`、`gemini-2.5-pro` | `gemini-2.5-flash`、`gemini-2.5-flash-lite` | `GOOGLE_API_KEY` |
| Alibaba（Qwen） | `qwen-plus`、`qwen3-max`、`qwen3-max-thinking` | `qwen-turbo`、`qwen-plus` | `QWEN_API_KEY` |

`ALLOW_USER_API_KEYS=true` に設定すれば、ユーザーがフロントエンドからセッション単位でAPIキーを入力することも可能です。

---

## 設定

すべての設定は `.env` ファイルで管理します（`.env.template` からコピー）：

```bash
# ── APIキー（少なくとも1つ必要）────────────────────────
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...       # ANTHROPIC_AUTH_TOKEN（OAuth認証）も対応
GOOGLE_API_KEY=...
QWEN_API_KEY=...

# ── プロバイダー選択 ──────────────────────────────────
# 対応: deepseek | openai | claude | gemini | qwen
DEFAULT_LLM_PROVIDER=deepseek       # 推論モデル
TRANSLATION_LLM_PROVIDER=openai     # 翻訳モデル

# ── モデル名 ──────────────────────────────────────────
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
CLAUDE_MODEL=claude-opus-4-6
GEMINI_MODEL=gemini-3.1-pro-preview
QWEN_MODEL=qwen-plus

# ── ランタイム設定 ────────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # ブロッキングLLM呼び出し用スレッドプールサイズ

# ── セキュリティ ──────────────────────────────────────
ALLOW_USER_API_KEYS=true     # UIからのキー入力を許可
# AUTH_TOKEN=...             # 全エンドポイントを保護（Bearerトークン）
SESSION_TTL_SECONDS=3600     # 動的セッショントークンの有効期間
MAX_SESSIONS_PER_IP_PER_HOUR=0   # 0 = 無制限
DAILY_MESSAGE_QUOTA_PER_IP=0     # 0 = 無制限

# ── WebSocket制限 ─────────────────────────────────────
MAX_WS_CONNECTIONS=200
MAX_WS_CONNECTIONS_PER_IP=5
WS_RATE_LIMIT_PER_SEC=5

# ── CORS ──────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ── Qwenリージョンエンドポイント（任意）──────────────
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

**コストのヒント：** デフォルトのデュアルLLM構成（DeepSeekで推論、GPT-4o-miniで翻訳）は品質を最大化しつつコストを最小化します。APIキーが1つしかない場合は、両方のプロバイダーを同じ値に設定してください。

全設定オプションとコメントは `.env.template` を参照してください。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18、TypeScript、Tailwind CSS |
| バックエンド | FastAPI、Python 3.11、uvicorn |
| ストリーミング | WebSocket（リアルタイムトークンストリーミング） |
| LLMプロバイダー | DeepSeek、OpenAI、Anthropic/Claude、Google/Gemini、Alibaba/Qwen |
| リバースプロキシ | nginx |
| デプロイ | Docker + Docker Compose |

---

## プロジェクト構成

```
ThinkLingo/
├── backend/
│   ├── app.py                           # FastAPIエントリポイント + WebSocket + 認証 + 流量制限
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 4ステップパイプラインコーディネーター
│   ├── agents/
│   │   ├── translator_agent.py          # 言語検出と翻訳（コードブロック保護）
│   │   └── questioner_agent.py          # 処理言語推論（5種類の応答タイプ）
│   ├── llms/
│   │   ├── base.py                      # 抽象LLMインターフェース
│   │   ├── deepseek_llm.py             # DeepSeek（思考連鎖対応）
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py               # APIキー + OAuth二重認証
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py                 # リージョンエンドポイント + 思考モデル
│   ├── prompt_router/
│   │   ├── models.py                    # PromptTemplateデータクラス
│   │   ├── registry.py                  # JSONから15以上のテンプレートを読み込み
│   │   ├── router.py                    # LLMベースの意図分類
│   │   └── templates.json               # 専門プロンプトテンプレート
│   └── utils/
│       ├── config.py                    # 型付き設定ローダー + バリデーション
│       ├── llm_factory.py              # LLMファクトリー（サーバー + リクエスト単位）
│       └── language_config.py           # 対応言語リスト
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TranslationChat.tsx      # メインオーケストレーター（WebSocket、状態、ストリーミング）
│   │   │   ├── DualColumnView.tsx       # レスポンシブ2カラムレイアウト
│   │   │   ├── TurnRow.tsx              # 会話ターン（思考 + ルーティングブロック）
│   │   │   ├── MessageBubble.tsx        # メッセージレンダラー（Markdown、コードコピー）
│   │   │   ├── InputBar.tsx             # 入力テキストエリア（IME対応）
│   │   │   ├── ChatHistory.tsx          # サイドバー会話マネージャー
│   │   │   ├── SettingsModal.tsx        # 言語、応答タイプ、ルーティングトグル
│   │   │   └── ApiConfigModal.tsx       # ロール別LLMプロバイダー/モデル/キー設定
│   │   ├── types/chat.ts               # TypeScriptインターフェース
│   │   └── utils/i18n.ts               # UI翻訳（英/中/日/韓）
│   ├── Dockerfile                       # マルチステージビルド（Node → nginx）
│   ├── nginx-frontend.conf              # 内部nginx SPAルーティング設定
│   └── tailwind.config.js               # カスタムvoidテーマ + グラスモーフィズム
├── nginx/
│   ├── nginx-local.conf                 # ローカルDocker設定（HTTP）
│   └── nginx.conf                       # 本番環境設定（HTTPS + 流量制限）
├── start.sh                             # ワンコマンドローカル起動スクリプト
├── docker-compose.yml                   # ローカルデプロイ
├── docker-compose.prod.yml              # 本番環境オーバーレイ（HTTPS、サブパス）
├── Dockerfile                           # バックエンドイメージ（python:3.11-slim）
└── .env.template                        # 設定テンプレート
```

---

## APIエンドポイント

### REST

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/health` | GET | ヘルスチェックとオーケストレーターステータス |
| `/api/languages` | GET | 対応言語一覧の取得 |
| `/api/response-types` | GET | 応答タイプ一覧の取得（汎用、創造的、分析的、教育的、技術的） |
| `/api/session` | POST | 短期セッショントークンの作成（IP単位で流量制限） |
| `/api/quota` | GET | 現在のIPの1日あたりメッセージ残りクォータを取得 |
| `/api/config` | GET | 機能フラグとサーバー設定済みプロバイダー一覧 |
| `/api/generate-title` | POST | 最初のメッセージから会話タイトルを生成 |

### WebSocket

| エンドポイント | プロトコル | 説明 |
|---|---|---|
| `/ws/chat` | WebSocket | 4ステップワークフローのストリーミングチャット、プロンプトルーティングと思考連鎖表示対応 |

---

## 拡張

- **LLMプロバイダーの追加** — `backend/llms/base.py` を継承し、`backend/utils/llm_factory.py` に登録、`Config` とフロントエンドの `ApiConfigModal.tsx` に追加
- **言語の追加** — `backend/utils/language_config.py`、エージェントプロンプト、`frontend/src/utils/i18n.ts` を更新
- **応答タイプの追加** — `backend/agents/questioner_agent.py` と `frontend/src/utils/i18n.ts` を更新
- **プロンプトテンプレートの追加** — `backend/prompt_router/templates.json` にエントリを追加

---

## ライセンス

[AGPL-3.0](LICENSE)
