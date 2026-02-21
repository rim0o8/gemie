# Gemini Live API Playground

Gemini Live API を対話形式で試す最小CLIアプリです。

## 使い方

```bash
cd play
cp .env.example .env
# .env の GOOGLE_API_KEY を設定
bun install
bun run doctor
bun run start
```

入力したテキストが Live API に送られます。終了は `/exit` です。

`bun run doctor` は APIキー・ネットワーク・指定モデル可用性を事前診断します。

診断をスキップして強制起動する場合:

```bash
cd play
bun run start:force
```

## テスト

```bash
cd play
bun run test
```
