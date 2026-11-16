# stocks-front

株分析システム（[stock-analysis](https://github.com/mstm09/stock-analysis)）の画面。
stock-analysis のAPI（FastAPI）を呼び出して、ブラウザに表示する。

## 使っているもの

| 役割 | 名前 | ひとことで言うと |
| :-- | :-- | :-- |
| 言語 | TypeScript | 型のあるJavaScript。間違いを実行前に見つけられる |
| 画面 | React | 画面を「部品（コンポーネント）」の組み合わせで作る |
| 土台 | Vite | 開発用サーバーと、公開用ファイルを作る道具 |
| 見た目 | Tailwind CSS | `className="text-sm font-bold"` のように、クラス名で見た目を書く |
| 画面遷移 | React Router | URLと画面の対応を決める |
| データ取得 | TanStack Query | APIの結果・読み込み中・エラーの状態を管理する |
| APIの型 | openapi-typescript / openapi-fetch | APIの仕様書（OpenAPI）から型を自動で作る |
| テスト | Vitest / Testing Library | 画面を組み立てて、表示を確かめる |
| 検査 | oxlint | 書き方の間違いを見つける |

## 準備

Node.js 22以上が必要。

```bash
npm install
```

## 動かす

1. stock-analysis 側でAPIを起動する（`http://127.0.0.1:8000`）。

   ```bash
   uv run stock-analysis serve
   ```

2. このリポジトリで開発サーバーを起動する。

   ```bash
   npm run dev
   ```

3. ブラウザで <http://localhost:5173> を開く。ファイルを保存すると、画面がすぐに変わる。

画面は `/api/...` を呼び、開発サーバーが `http://127.0.0.1:8000/...` へ中継する（`vite.config.ts` の `proxy`）。
APIの場所を変えるときは `API_TARGET=http://192.168.0.10:8000 npm run dev` のようにする。

stock-analysis 側で `API_TOKEN` を設定しているときは、`.env.example` を `.env.local` にコピーして `VITE_API_TOKEN` に同じ値を書く。

## コマンド

| コマンド | 内容 |
| :-- | :-- |
| `npm run dev` | 開発サーバーを起動する |
| `npm test` | テストを実行する（`npm run test:watch` は、保存のたびに実行） |
| `npm run lint` | 書き方を検査する |
| `npm run build` | 型を検査して、公開用のファイルを `dist/` に作る |
| `npm run preview` | `dist/` の中身を手元で確かめる |
| `npm run api:fetch` | 起動中のAPIから仕様書を取り、`openapi/openapi.json` を更新する |
| `npm run api:gen` | `openapi/openapi.json` から型（`src/api/schema.d.ts`）を作り直す |

## APIが変わったとき

stock-analysis のAPIに項目やエンドポイントを足したら、APIを起動した状態で次を実行する。

```bash
npm run api:fetch && npm run api:gen
```

型が変わるので、画面側で直すべき場所は `npm run build` がエラーとして教えてくれる。

## ファイルの役割

```
index.html            入口のHTML。<div id="root"> にReactの画面が入る
vite.config.ts        Viteの設定（APIへの中継、テストの設定）
openapi/openapi.json  APIの仕様書（stock-analysis から取ったもの）
src/
  main.tsx            入口。Reactを起動する
  routes.tsx          URLと画面の対応表
  router.ts           対応表から、ブラウザ用のルーターを作る
  index.css           Tailwind CSSの読み込みと、全体の色
  api/schema.d.ts     APIの型（自動生成。手で直さない）
  lib/api.ts          APIを呼ぶ部品
  lib/format.ts       数値や銘柄コードを、画面に出す文字に直す
  components/         複数の画面で使う部品（Layout = 共通の枠）
  features/           機能ごとの部品（candidates = 売り建て候補の表、チャート、APIの呼び出し）
  pages/              画面（1画面 = 1ファイル）。`*.test.tsx` はそのテスト
  test/               テストの前準備と、テスト用の道具
```

## 画面

| URL | 内容 | 使うAPI |
| :-- | :-- | :-- |
| `/` | APIとの接続の確認 | `GET /health` |
| `/candidates` | 売り建て候補の表。行を選ぶと、チャートと条件A〜Gの判定を出す | `GET /candidates`、`GET /stocks/{code}/chart` |

## 画面を増やす手順

1. `src/pages/` に画面のファイルを作る。
2. `src/routes.tsx` に、URLとの対応を1行足す。
3. `src/components/Layout.tsx` の `NAV_ITEMS` に、メニューを1行足す。

## ブランチ運用

stock-analysis と同じ（[ADR-0003](https://github.com/mstm09/stock-analysis/blob/develop/docs/adr/0003-git-hosting-and-branching.md)）。

- `develop` から `feature/PY-<課題番号>_<名前>` を作り、PRで `develop` へマージする。
- 課題は YouTrack の「株」プロジェクト（PY）で管理する。
