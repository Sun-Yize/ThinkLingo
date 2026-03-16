<div align="center">

# ThinkLingo：言語の壁を超える LLM 推論エンジン

**母語で質問し、英語で推論 —— 非英語による"性能低下"に別れを告げ、大規模言語モデルの推論能力を 100% 引き出す。**

![Demo](assets/thinklingo_demo.gif)

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[English](README_EN.md) | [中文](README.md) | [**日本語**](README_JA.md) | [한국어](README_KO.md)

</div>

> [!Important]
> 🎉 **ThinkLingo が正式リリースされました！**
> [thinklingo.yizesun.com](https://thinklingo.yizesun.com) にアクセスすれば、デプロイ不要ですぐにお試しいただけます。

---

## なぜ ThinkLingo が必要なのか？

**課題：** 主要な大規模言語モデル（LLM）の学習データは英語が中心であることは広く知られています。中国語や日本語などの非英語で複雑なロジック、コード、数学の問題を投げかけると、モデルの推論能力が著しく低下する、いわゆる"性能劣化"が発生しがちです。

**解決策：** ThinkLingo はこの問題をスマートに解決します。バックグラウンドでユーザーの入力をモデルが最も得意とする「処理言語」（デフォルトは英語）に自動翻訳し、最適な状態で深い推論を行った上で、高品質な回答をシームレスに母語へ翻訳して返します。

### 主なメリット

- **推論性能のボトルネックを解消**：どの言語で質問しても、ネイティブ英語プロンプトと同等のトップレベルの推論品質が得られます。
- **圧倒的なコストパフォーマンス（デュアルモデルアーキテクチャ）**：翻訳には「安価で高速」なモデル（例：GPT-4o-mini）を、本格的な推論には「高性能だが高コスト」なモデル（例：DeepSeek-Reasoner / Claude 3.5 Sonnet）をそれぞれ割り当てることで、品質を維持しつつ API コストを大幅に削減できます。
- **プロセスの完全な可視化**：独自のデュアルカラム UI を採用。左カラムにはモデルのネイティブな推論過程（思考連鎖を含む）、右カラムには母語への翻訳を表示し、結果だけでなくモデルの思考ロジックをいつでも確認できます。

**ワークフローデモ：**
![Workflow](assets/img02.png)

---

## ご利用ガイド

<table>
<tr>
<td width="50%">

![モデル自由組み合わせ](https://github.com/user-attachments/assets/5ed1e3b2-795c-4924-87c4-1f6f18e3f209)

</td>
<td width="50%">

![言語選択](https://github.com/user-attachments/assets/80664072-617a-46d5-a6a5-7145fe93bf54)

</td>
</tr>
<tr>
<td align="center"><b>モデル自由組み合わせ</b><br/>デュアル LLM アーキテクチャにより、推論モデルと翻訳モデルを自由に組み合わせ、品質とコストを最適化。DeepSeek、OpenAI、Claude、Gemini、Qwen に対応。</td>
<td align="center"><b>言語選択</b><br/>中国語、英語、日本語、韓国語に対応。ソース言語と処理言語を自由に切り替え、UI は自動的にローカライズされます。</td>
</tr>
<tr>
<td width="50%">

![テーマ切り替え](https://github.com/user-attachments/assets/5417519a-433c-430c-9666-66c2440b2a23)

</td>
<td width="50%">

![スマートプロンプトルーティング](https://github.com/user-attachments/assets/71c5b1bd-b675-4e20-837e-e2d08eeab38f)

</td>
</tr>
<tr>
<td align="center"><b>テーマ切り替え</b><br/>複数のテーマを内蔵し、ライト/ダークモードをワンクリックで切り替え。個性的なクロスランゲージチャット体験を実現します。</td>
<td align="center"><b>スマートプロンプトルーティング</b><br/>意図認識を内蔵し、質問の種類（コードデバッグ、数学解法、クリエイティブライティングなど）を自動判別して、最適な System Prompt を動的に注入します。</td>
</tr>
</table>

---

## クイックスタート

### 方法 1：Docker デプロイ（推奨）

**前提条件：** [Docker](https://www.docker.com/) および [Docker Compose](https://docs.docker.com/compose/) がインストール済みであること。

```bash
# 1. リポジトリをクローン
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo

# 2. ワンコマンドで起動
docker-compose up -d
```

起動後、ブラウザで **<http://localhost:3000>** にアクセスしてください。初回アクセス時に、UI が API キーの設定をガイドします。

> **よく使うメンテナンスコマンド：**
> - `docker-compose logs -f`：リアルタイムログを表示
> - `docker-compose down`：コンテナを停止・削除
> - `docker-compose up -d --build`：コード変更後に再ビルド

---

### 方法 2：ローカルソースコードで実行

**前提条件：** Python 3.11+、Node.js 18+。

```bash
# 1. クローンして設定ファイルを準備
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env

# 2. 起動スクリプトを実行
bash start.sh
```
スクリプトが自動的に依存関係をインストールし、ポート `8000` でバックエンド、ポート `3000` でフロントエンドを起動します。`Ctrl+C` ですべてのサービスを停止できます。

<details>
<summary>手動でステップごとに起動する場合（スクリプトを使わない）</summary>

```bash
# ターミナル 1 — バックエンド
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000

# ターミナル 2 — フロントエンド
cd frontend
npm install
npm start
```

</details>

---

## 対応 LLM プロバイダー

ThinkLingo は**デュアル LLM アーキテクチャ**を採用しており、「推論」モデルと「翻訳」モデルを自由に組み合わせることができます。

| プロバイダー | 推論モデル | 翻訳モデル | API キー環境変数 |
|---|---|---|---|
| DeepSeek | `deepseek-chat`、`deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`、`gpt-4o-mini`、`o3-mini` | `gpt-3.5-turbo`、`gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`、`claude-sonnet-4-5` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`、`gemini-2.5-pro` | `gemini-2.5-flash`、`gemini-2.5-flash-lite` | `GOOGLE_API_KEY` |
| Alibaba（Qwen） | `qwen-plus`、`qwen3-max`、`qwen3-max-thinking` | `qwen-turbo`、`qwen-plus` | `QWEN_API_KEY` |

ユーザーはフロントエンド UI から現在のセッション用に自分の API キーを入力することもできます（`ALLOW_USER_API_KEYS=true` の設定が必要）。

---

## 設定

すべての設定項目は `.env` ファイルで管理します（`.env.template` からコピー）。

```bash
# ── API キー（少なくとも 1 つ必要）─────────────────────
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...       # ANTHROPIC_AUTH_TOKEN（OAuth 認証）にも対応
GOOGLE_API_KEY=...
QWEN_API_KEY=...

# ── プロバイダー選択 ──────────────────────────────────
# 対応: deepseek | openai | claude | gemini | qwen
DEFAULT_LLM_PROVIDER=deepseek       # 推論モデル
TRANSLATION_LLM_PROVIDER=openai     # 翻訳モデル

# ── モデル名 ────────────────────────────────────────
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
CLAUDE_MODEL=claude-opus-4-6
GEMINI_MODEL=gemini-3.1-pro-preview
QWEN_MODEL=qwen-plus

# ── ランタイム設定 ──────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # ブロッキング LLM 呼び出し用スレッドプールサイズ

# ── セキュリティ設定 ────────────────────────────────
ALLOW_USER_API_KEYS=true     # ユーザーが UI から API キーを入力可能にする
# AUTH_TOKEN=...             # 全エンドポイントを保護（Bearer Token）
SESSION_TTL_SECONDS=3600     # 動的セッショントークンの有効期間
MAX_SESSIONS_PER_IP_PER_HOUR=0   # 0 = 無制限
DAILY_MESSAGE_QUOTA_PER_IP=0     # 0 = 無制限

# ── WebSocket 制限 ─────────────────────────────────
MAX_WS_CONNECTIONS=200
MAX_WS_CONNECTIONS_PER_IP=5
WS_RATE_LIMIT_PER_SEC=5

# ── CORS ────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ── Qwen リージョンエンドポイント（任意）──────────
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

> **コスト節約のヒント**：推論モデルには `DeepSeek-Reasoner` または `Claude 3.5 Sonnet` を、翻訳モデルには `GPT-4o-mini` または `Gemini 2.5 Flash` を使用するのがおすすめです。最高レベルの論理能力を維持しながら、翻訳コストを最小限に抑えることができます。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18、TypeScript、Tailwind CSS |
| バックエンド | FastAPI、Python 3.11、uvicorn |
| ストリーミング | WebSocket（リアルタイムトークンストリーミング） |
| LLM プロバイダー | DeepSeek、OpenAI、Anthropic/Claude、Google/Gemini、Alibaba/Qwen |
| リバースプロキシ | nginx |
| デプロイ | Docker + Docker Compose |

---

## プロジェクト構成

```
ThinkLingo/
├── backend/
│   ├── app.py                           # FastAPI エントリポイント + WebSocket + 認証 + レート制限
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 4 ステップパイプラインオーケストレーター
│   ├── agents/
│   │   ├── translator_agent.py          # 言語検出と翻訳（コードブロック保護）
│   │   └── questioner_agent.py          # 処理言語での推論（5 種類の応答タイプ）
│   ├── llms/
│   │   ├── base.py                      # 抽象 LLM インターフェース
│   │   ├── deepseek_llm.py             # DeepSeek（思考連鎖対応）
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py               # API キー + OAuth デュアル認証
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py                 # リージョンエンドポイント + 思考モデル
│   ├── prompt_router/
│   │   ├── models.py                    # PromptTemplate データクラス
│   │   ├── registry.py                  # JSON から 15 以上のテンプレートを読み込み
│   │   ├── router.py                    # LLM ベースの意図分類
│   │   └── templates.json               # 専門プロンプトテンプレート
│   └── utils/
│       ├── config.py                    # 型付き設定ローダー + バリデーション
│       ├── llm_factory.py              # LLM ファクトリ（サーバー側 + リクエスト単位生成）
│       └── language_config.py           # 対応言語一覧
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TranslationChat.tsx      # メインオーケストレーター（WebSocket、状態管理、ストリーミング）
│   │   │   ├── DualColumnView.tsx       # レスポンシブデュアルカラムレイアウト
│   │   │   ├── TurnRow.tsx              # 会話ターン（思考 + ルーティングブロック）
│   │   │   ├── MessageBubble.tsx        # メッセージレンダラー（Markdown、コードコピー）
│   │   │   ├── InputBar.tsx             # 入力テキストエリア（IME 対応）
│   │   │   ├── ChatHistory.tsx          # サイドバー会話マネージャー
│   │   │   ├── SettingsModal.tsx        # 言語、応答タイプ、ルーティング切替
│   │   │   └── ApiConfigModal.tsx       # ロール別 LLM プロバイダー/モデル/キー設定
│   │   ├── types/chat.ts               # TypeScript インターフェース
│   │   └── utils/i18n.ts               # UI 翻訳（英/中/日/韓）
│   ├── Dockerfile                       # マルチステージビルド（Node → nginx）
│   ├── nginx-frontend.conf              # 内部 nginx SPA ルーティング設定
│   └── tailwind.config.js               # カスタム void テーマ + グラスモーフィズム効果
├── nginx/
│   ├── nginx-local.conf                 # ローカル Docker 設定（HTTP）
│   └── nginx.conf                       # 本番環境設定（HTTPS + レート制限）
├── tools/
│   └── bench_qwen.py                   # Qwen モデルベンチマークツール
├── start.sh                             # ワンコマンドローカル起動スクリプト
├── docker-compose.yml                   # ローカルデプロイ
├── docker-compose.prod.yml              # 本番環境オーバーライド設定（HTTPS、サブパス）
├── Dockerfile                           # バックエンドイメージ（python:3.11-slim）
└── .env.template                        # 設定テンプレート
```

---

## API エンドポイント

### REST

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/health` | GET | ヘルスチェックとオーケストレーター状態 |
| `/api/languages` | GET | 対応言語一覧の取得 |
| `/api/response-types` | GET | 応答タイプ一覧の取得（汎用、クリエイティブ、分析、教育、技術） |
| `/api/session` | POST | 短期セッショントークンの作成（IP 単位でレート制限） |
| `/api/quota` | GET | 現在の IP の日次メッセージ残りクォータを取得 |
| `/api/config` | GET | 機能フラグおよび利用可能なサーバー側プロバイダー設定 |
| `/api/generate-title` | POST | 最初のメッセージから会話タイトルを生成 |

### WebSocket

| エンドポイント | プロトコル | 説明 |
|---|---|---|
| `/ws/chat` | WebSocket | 4 ステップワークフローのストリーミング対話（プロンプトルーティングと思考連鎖表示に対応） |

---

## コントリビューション

あらゆる形式のコントリビューションを歓迎します！バグ報告、新しい LLM プロバイダーの追加、フロントエンド UI の改善など、お気軽にご参加ください。
- **LLM の追加**：`backend/llms/base.py` を継承し、`backend/utils/llm_factory.py` およびフロントエンドの `ApiConfigModal.tsx` に登録します。
- **言語の追加**：`backend/utils/language_config.py` とフロントエンドの `frontend/src/utils/i18n.ts` を更新します。
- **プロンプトテンプレートの追加**：`backend/prompt_router/templates.json` に設定を追加するだけで完了です。

---

## ライセンス

本プロジェクトは [AGPL-3.0 License](LICENSE) に基づいてオープンソースで公開されています。
