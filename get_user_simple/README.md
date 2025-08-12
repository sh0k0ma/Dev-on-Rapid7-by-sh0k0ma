# get_user_simple

コンソール上で API キーを入力（または環境変数で指定）し、全リージョンの全ユーザーを取得して表示する最小構成の Node.js ツールです。GUI はありません。

## 必要要件
- Node.js v18 以上（LTS 推奨）
- インターネット接続
- ユーザー一覧取得が可能な有効な API キー

## ディレクトリ構成
```
Dev-on-Rapid7-by-sh0k0ma/get_user_simple/
├─ package.json
├─ README.md
├─ .gitignore
├─ src/
│  ├─ index.js         # CLI エントリ
│  ├─ config.js        # BASE_URL / エンドポイント / ヘッダー方式 / リージョン / ページネーション
│  ├─ api.js           # HTTP 呼び出し（API キー付与・共通ヘッダー・エラー処理）
│  ├─ aggregator.js    # 単一 or 複数リージョンからの結果統合・重複排除
│  ├─ output.js        # 表形式 / JSON 出力
│  └─ util/
│     └─ retry.js      # 429/5xx の指数バックオフ（リトライ）
└─ test/
   └─ smoke.test.md    # 手動確認用チェックリスト
```

## インストール
依存は標準モジュールのみです（追加依存がある場合のみインストール）。

```bash
cd Dev-on-Rapid7-by-sh0k0ma/get_user_simple
npm install  # 追加依存がある場合のみ（なければ不要）
```

## 設定（`src/config.js`）
実際の API に合わせて編集してください。
- `BASE_URL` 例: `https://api.example.com`
- エンドポイント
  - 単一エンドポイントで全ユーザー取得: `ALL_USERS_PATH`
  - リージョン別エンドポイント: `USERS_BY_REGION_PATH`（`{region}` を置換）
- ヘッダー方式: `HEADER_MODE` = `bearer` または `x-api-key`
- `REGIONS`: 全リージョンのコード配列（リージョン別取得時に使用）
- ページネーション設定 (`PAGINATION`)
  - `STRATEGY`: `none` | `cursor` | `offset`
  - `ITEMS_PATH`: レスポンス内の配列のパス（例: `items`）
  - Cursor 方式: `CURSOR_PARAM`, `NEXT_CURSOR_PATH`
  - Offset 方式: `LIMIT_PARAM`, `OFFSET_PARAM`, `PAGE_SIZE`
- 取得モード: `MODE` = `all`（単一）または `region`（リージョン横断）
- リトライ: `MAX_RETRIES`, `INITIAL_BACKOFF_MS`, `BACKOFF_FACTOR`

## 使い方
対話的に API キーを入力:
```bash
npm start
# または
node ./src/index.js
```
- プロンプト `Enter API key:` が表示されるので、API キーを入力してください（空入力はエラー）。
- 可能な環境では入力は非表示（no-echo）になります。

環境変数で API キーを渡す（非対話）:
```bash
API_KEY="xxxxxxxx" node ./src/index.js
```
- 環境変数 `API_KEY` が設定されている場合、プロンプトはスキップされます。

JSON で出力:
```bash
node ./src/index.js --json
```
- 取得結果を JSON 配列でそのまま標準出力します。

## 出力例
```
ID       Email                Name         Region   Status
1        alice@example.com    Alice Doe    us       active
...
Total users: 50 (regions covered: 5)
```

## エラーハンドリング / 終了コード
- 401 / 403: API キー不正または権限不足 → 明示メッセージを表示（終了コード 1）
- 429: レート制限 → 自動で指数バックオフ再試行（一定回数超過で終了コード 2）
- 5xx / ネットワーク: 一時的な障害 → リトライ後も失敗で終了コード 2
- 構成エラー（設定不備など）→ 終了コード 3

終了コード一覧:
- `0`: 成功
- `1`: 認証エラー（401/403 等）
- `2`: ネットワーク/サーバーエラー（429/5xx のリトライ超過など）
- `3`: 設定エラー（必須設定不足・不整合）

## セキュリティ
- API キーは 標準入力 または 環境変数 `API_KEY` からのみ取得します。
- ログには API キーを出力しません（必要な場合でも末尾 4 文字のみ表示）。
- 秘密情報はリポジトリにコミットしないでください。

## トラブルシュート
- ユーザー数が少ない / 途中で途切れる: ページネーション設定（`STRATEGY`・`ITEMS_PATH`・`cursor/offset` など）を確認。
- リージョンが一部しか出ない: `REGIONS` 配列の網羅性を確認（新規リージョン追加時は更新が必要）。
- 401/403: API キーの有効性・スコープ・送信ヘッダー方式（`bearer` / `x-api-key`）の不一致を確認。
- 429: 短時間の大量実行を避け、しばらく待ってから再実行。

## スクリプト（`package.json`）
```json
{
  "scripts": {
    "start": "node ./src/index.js",
    "test": "echo \"No tests defined\""
  }
}
```

## 手動テスト
手順は `test/smoke.test.md` を参照してください。