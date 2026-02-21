# Codex Repository Instructions

## Language

- レスポンスは日本語で行う
- Technical terms と code identifiers は English のままでよい

## Coding Style

- 不変データを優先し、オブジェクトの直接ミューテーションを避ける
- TypeScript strict mode を前提に実装する
- API 境界と外部入力境界は Zod で検証する
- 例外を握りつぶさず、エラーハンドリングを明示する
- 1関数50行未満、1ファイル800行未満を目安にする

## Workflow

- TDD（テスト先行）で進める
- Conventional Commits を使う
- 最低テストカバレッジは80%

## Security

- Secret をハードコードしない
- 機密値は環境変数から取得する
- ユーザー入力は常に検証する
