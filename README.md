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

## APIなしで動かす（仮のデータ）

stock-analysis のAPIやMySQLを起動せずに、決まったデータで全画面を開ける。画面の見た目を直すときに使う。

```bash
npm run dev:mock
```

- 開発サーバーが `/api/...` に自分で答える（`mock/` の中身）。
- 売買記録の登録や決済は、開発サーバーを動かしている間だけ覚えている。再起動すると元に戻る。
- 数値は作り物。計算の決まりは本物に似せているが、同じではない。最後は本物のAPIで確かめる。

## コマンド

| コマンド | 内容 |
| :-- | :-- |
| `npm run dev` | 開発サーバーを起動する（stock-analysis のAPIへつなぐ） |
| `npm run dev:mock` | 開発サーバーを起動する（仮のデータで答える） |
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
vite.config.ts        Viteの設定（APIへの中継、仮のAPI、テストの設定）
components.json       shadcn/ui の設定
openapi/openapi.json  APIの仕様書（stock-analysis から取ったもの）
mock/                 仮のデータと、仮のAPI（`npm run dev:mock` 用）
deploy/               本番の設定例（nginx）
docs/deploy.md        本番への配置の手順
src/
  main.tsx            入口。Reactを起動する
  routes.tsx          URLと画面の対応表
  router.ts           対応表から、ブラウザ用のルーターを作る
  index.css           Tailwind CSSの読み込みと、全体の色（shadcn/ui の色もここ）
  api/schema.d.ts     APIの型（自動生成。手で直さない）
  pages/              画面（1画面 = 1ファイル）。`*.test.tsx` はそのテスト
  features/           機能ごとの部品と、APIの呼び出し（api.ts）
    candidates/         売り建て候補の表
    stocks/             銘柄のチャート、条件の判定、検索欄
    market/             騰落の表、業種ランキングの表
    trades/             売買記録の表、入力フォーム、入出金
  components/         複数の機能で使う部品（Layout = 共通の枠、FormDialog = 入力フォームの枠 など）
  components/ui/      shadcn/ui の部品（`npx shadcn@latest add <名前>` で増やす。自動生成）
  lib/                部品ではない道具
    api.ts              APIを呼ぶ部品
    format.ts           数値や銘柄コードを、画面に出す文字に直す
    useUrlParams.ts     URLの ?as_of=... を読み書きする
  test/               テストの前準備と、テスト用の道具・データ
```

### 読む順番（Reactが初めての場合）

1. `src/main.tsx` → `src/routes.tsx` → `src/components/Layout.tsx`（画面の骨組み）
2. `src/pages/HomePage.tsx`（いちばん小さい画面。APIを1つ呼ぶ）
3. `src/pages/CandidatesPage.tsx` と `src/features/candidates/`（表、並べ替え、選択）
4. `src/pages/MarketPage.tsx`（条件を切り替えて、取り直す）
5. `src/features/trades/api.ts` と `TradeDialogs.tsx`（APIへ書き込む。入力フォーム）

## 本番への配置

[docs/deploy.md](docs/deploy.md)（nginx でファイルを配り、`/api` をAPIへ中継する）。

## 画面

| URL | 内容 | 使うAPI |
| :-- | :-- | :-- |
| `/` | 各画面への入口と、APIとの接続の確認 | `GET /health` |
| `/candidates` | 売り建て候補の表。行を選ぶと、チャートと条件A〜Gの判定を出す | `GET /candidates`、`GET /stocks/{code}/chart` |
| `/stocks/:code` | 1銘柄の指標・チャート・条件の判定（候補でない銘柄も） | `GET /stocks/{code}/indicators`、`/chart` |
| `/market` | 騰落（値上がり・値下がりの銘柄数）と、33業種の上昇率ランキング | `GET /market/breadth`、`/market/sectors`、`/markets` |
| `/trades` | 売買記録の一覧と、売買の登録 | `GET/POST /trades` |
| `/trades/:id` | 売買1件。決済、ロスカットなどの変更、自己採点、削除 | `/trades/{id}`、`/trades/{id}/exits` |
| `/portfolio` | 口座全体（現金残高、評価額、損益）、保有中、入出金 | `GET /portfolio`、`/cash` |

上のメニューの検索欄で、銘柄コードか銘柄名から銘柄詳細へ移れる（`GET /stocks?q=`）。

基準日・期間・選んだ銘柄などは、URLの `?as_of=...` に持たせている。再読み込みしても同じ表示に戻る。

## 画面を増やす手順

1. `src/pages/` に画面のファイルを作る。
2. `src/routes.tsx` に、URLとの対応を1行足す。
3. `src/components/Layout.tsx` の `NAV_ITEMS` に、メニューを1行足す。

## 自動テスト（CircleCI）

pushのたびに、CircleCIで `npm run lint`、`npm test`、`npm run build` が走る（`.circleci/config.yml`）。
最初に一度だけ、CircleCIの画面で stocks-front をプロジェクトとして追加する（stock-analysis と同じ手順）。

## ブランチ運用

stock-analysis と同じ（[ADR-0003](https://github.com/mstm09/stock-analysis/blob/develop/docs/adr/0003-git-hosting-and-branching.md)）。

- `develop` から `feature/FE-<課題番号>_<名前>` を作り、PRで `develop` へマージする。
- 課題は YouTrack の「stocks-front」プロジェクト（FE）で管理する。
