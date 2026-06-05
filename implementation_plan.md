# 実装計画書：QRコード影投影STL変換Webアプリ

**対象要件定義書:** `requirements_v1.3.md`
**作成日:** 2026-06-03
**実装方針:** Phase順に全フェーズ実装 / Docker化（本番想定） / FastAPI BackgroundTasks

---

## 1. 全体構成

モノレポ構成を採用する。フロントエンドとバックエンドの型・スキーマ整合を取りやすく、Dockerでの一括ビルド・デプロイにも適する。

```
ShadowQR/
├── backend/                       # FastAPI + Python 3.11
│   ├── app/
│   │   ├── api/                   # REST / WebSocket エンドポイント
│   │   ├── core/                  # F10〜F18 のコアロジック
│   │   │   ├── qr.py              # F10
│   │   │   ├── voxelize.py        # F11
│   │   │   ├── wall_uv.py         # F12
│   │   │   ├── homography.py      # F13
│   │   │   ├── raycast.py         # F14, F15
│   │   │   ├── meshing.py         # F16, F17
│   │   │   └── verify.py          # F18
│   │   ├── models/                # Pydantic スキーマ
│   │   ├── jobs/                  # BackgroundTasks ジョブ管理
│   │   └── main.py                # FastAPI エントリポイント
│   ├── tests/                     # pytest（UT / IT）
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/                      # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── components/            # UI コンポーネント
│   │   ├── viewers/               # Three.js ビューア（F20, F22, F23）
│   │   ├── api/                   # バックエンド通信（REST / WS）
│   │   ├── store/                 # 状態管理（Zustand 推奨）
│   │   └── App.tsx
│   ├── tests/                     # Vitest + React Testing Library
│   ├── Dockerfile                 # multi-stage: node ビルド → nginx 配信
│   └── package.json
│
├── tests/
│   ├── e2e/                       # Playwright（E2E-01〜E2E-06）
│   └── fixtures/                  # 直方体 / 複雑ポリゴン / 破損 STL
│
├── docker-compose.yml             # ローカル開発・本番想定
├── .github/workflows/             # CI/CD（GitHub Actions）
├── requirements_v1.3.md
└── implementation_plan.md         # 本ドキュメント
```

---

## 2. Phase 1: 基盤構築

### 2-1. 目的
プロジェクトの足場を作り、ローカルおよび Docker 上で「Hello World」レベルのフロント・バックエンドが疎通するところまでを完成させる。

### 2-2. タスク

| # | タスク | 成果物 |
|---|--------|--------|
| P1-1 | バックエンド初期化 | `backend/pyproject.toml`、`app/main.py`（FastAPI ヘルスチェック `/health`） |
| P1-2 | バックエンド依存導入 | `fastapi`, `uvicorn`, `numpy`, `numpy-stl`, `trimesh`, `qrcode`, `opencv-python`, `scikit-image`, `pyzbar`, `pydantic`, `python-multipart`, `websockets` |
| P1-3 | フロントエンド初期化 | Vite + React + TS テンプレート、Three.js / `@react-three/fiber` / `@react-three/drei` / `zustand` 導入 |
| P1-4 | Dockerfile（backend） | `python:3.11-slim` ベース、`pyzbar` 用の `libzbar0` を APT で追加 |
| P1-5 | Dockerfile（frontend） | multi-stage（`node:20` でビルド → `nginx:alpine` で配信） |
| P1-6 | docker-compose.yml | backend(:8000) と frontend(:5173) を起動、開発時はボリュームマウント |
| P1-7 | セッション一時ディレクトリ設計 | `/tmp/shadowqr/{job_id}/` のライフサイクルを決定（処理完了 or TTL 失効で削除） |

### 2-3. 完了条件
- `docker compose up` でフロントエンド・バックエンドが起動する
- フロントエンドから `/health` を fetch して 200 OK が返る

---

## 3. Phase 2: バックエンドコアロジック（F10〜F18）

### 3-1. 実装順序と注意点

依存関係順に実装する。**各機能ごとに UT を並行作成**し、テストグリーンを確認してから次へ進む。

| 順 | 機能 | 実装内容 | UT |
|---|------|----------|----|
| 1 | F10 QR 生成 | `qrcode` ライブラリでエラー訂正レベル H・白黒 2 値 numpy 配列出力 | UT-01, UT-02 |
| 2 | F11 STL ボクセル化 | `trimesh` で STL ロード → 入力 4×4 回転行列を頂点に適用 → `mesh.voxelized(pitch)` でグリッド化 → `uint8` 配列で保持 | UT-03, UT-04 |
| 3 | F12 壁面 UV 座標系 | 法線 **n** からグラムシュミット法で正規直交基底 **u**, **v** を構築 | UT-05, UT-06 |
| 4 | F13 逆透視変換 | 光源・壁面 4 点の対応から `cv2.getPerspectiveTransform` で Homography 算出、`cv2.warpPerspective` で `INTER_LANCZOS4` 補間 | UT-07, UT-08 |
| 5 | F14 削りレイキャスト | 白画素 → 光源から壁面画素へのレイ上のボクセルを 3D DDA（Amanatides-Woo）で 0 にする。`numpy` または Numba で並列化 | UT-09 |
| 6 | F15 影保証チェック | 黒画素 → レイ上に最低 1 ボクセル残す。すでに全消去されていたら最も光源に近い 1 ボクセルを残す（または警告） | UT-10 |
| 7 | F16 メッシュ変換 | `skimage.measure.marching_cubes` でボクセル → 三角メッシュ。閉じた曲面の検証も付与 | UT-11 |
| 8 | F17 STL エクスポート | `numpy-stl` でバイナリ STL 出力 | （IT で検証） |
| 9 | F18 QR 自動検証 | 影シミュレーター出力画像を `cv2.QRCodeDetector` でデコード → 入力文字列と完全一致を判定 | UT-12, UT-13 |

### 3-2. 重要な実装上の制約

**メモリ最適化（T2 対応）**
- ボクセル解像度 0.5mm × 10cm 角 = 200³ = 800 万ボクセル
- `numpy.uint8` グリッド（0/1 のみ）で約 8MB に抑える
- レイキャストは in-place 更新、コピー禁止
- Numba `@njit(parallel=True)` でレイ並列化（性能ボトルネック確認後）

**QR モジュールサイズの自動スケーリング（T4 対応）**
```
必要ボクセル数 = ceil(投影QRサイズ / (QRモジュール数 × ボクセル解像度)) ≥ 3
```
F13 実行前にチェックし、満たさない場合はボクセル解像度を自動調整するか、UI に警告を返す。

**光源位置バリデーション（T3 対応）**
- 光源が STL バウンディングボックス内部にある場合はエラー
- 光源・壁面の幾何関係が「光源 → 壁面方向」と矛盾する場合もエラー

### 3-3. 完了条件
- UT-01〜UT-13 がすべてグリーン
- バックエンドコアロジックのカバレッジ 80% 以上

---

## 4. Phase 3: API 層と非同期処理

### 4-1. エンドポイント設計

| メソッド | パス | 用途 |
|---------|------|------|
| `POST` | `/api/convert` | STL + QR 文字列 + パラメータを受領 → `job_id` を返却（即時）。BackgroundTasks にジョブ投入 |
| `WebSocket` | `/api/progress/{job_id}` | F24 進捗をストリーミング配信（ボクセル化 / 逆透視 / レイキャスト / メッシュ化 / 検証） |
| `GET` | `/api/result/{job_id}` | 出力 STL のメタ情報 + F18 検証結果（成功 / 失敗 / 警告メッセージ） |
| `GET` | `/api/download/{job_id}` | バイナリ STL をストリーミングダウンロード（F18 成功時のみ） |
| `DELETE` | `/api/job/{job_id}` | セッション一時ファイル削除（明示的）|

### 4-2. データ契約

**`POST /api/convert` リクエスト（multipart/form-data）**
- `stl_file`: バイナリ STL（≤100MB）
- `qr_text`: string（≤2953 バイト）
- `params`: JSON
  ```json
  {
    "light": [0, 50, 150],
    "wall_normal": [0, 0, -1],
    "wall_offset": 500,
    "qr_size": 100,
    "qr_error_level": "H",
    "voxel_pitch": 0.5,
    "rotation_matrix": [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
  }
  ```

**WebSocket 進捗メッセージ**
```json
{ "step": "voxelize" | "homography" | "raycast" | "meshing" | "verify",
  "progress": 0.0-1.0,
  "message": "..." }
```

### 4-3. ジョブ管理
- `app/jobs/store.py` にメモリ内ジョブストア（`dict[job_id, JobState]`）
- 並行ジョブ数は環境変数で制限（デフォルト 2）
- 完了 / 失敗から 1 時間後に一時ファイル自動削除（非機能要件 セキュリティ）

### 4-4. 完了条件
- `curl` / Postman でジョブ投入 → 進捗購読 → STL ダウンロードまで通る
- IT-01（基本パイプライン）がエンドツーエンドでグリーン

---

## 5. Phase 4: フロントエンド UI

### 5-1. コンポーネント分割

| コンポーネント | 対応機能 | 説明 |
|---------------|---------|------|
| `UploadZone` | F01 | ドラッグ&ドロップ、100MB チェック |
| `QRTextInput` | F03 | 文字数カウンタ、2953 バイト制限 |
| `ParamPanel` | F04 | 光源 XYZ・壁面法線・オフセット・QR サイズ・誤り訂正・ボクセル解像度 |
| `AngleDisplay` | （F04） | 光源・壁面から照射角度をリアルタイム計算（FE-13 / FE-14） |
| `InputStlViewer` | F20, F21 | Three.js ビューア + `TransformControls`（rotate）+ ±90° ボタン 6 個 |
| `OutputStlViewer` | F22 | `OrbitControls` のみ |
| `ShadowSimulator` | F23 | バックエンドの F13 結果画像を Canvas で表示、もしくは Three.js の `SpotLight` + `shadowMap` で疑似再現 |
| `ProgressBar` | F24 | WebSocket 購読 |
| `VerifyResult` | F25 | ✓ / ✗ 表示 |
| `DownloadButton` | F26 | F18 成功時のみ活性化 |

### 5-2. 状態管理

Zustand で以下のストアを構成:
- `stlStore`: 入力 STL、回転行列
- `paramStore`: 投影パラメータ
- `jobStore`: ジョブ ID、進捗、検証結果

### 5-3. 回転行列の取り扱い（T9 対応）

- `TransformControls` の onChange でクォータニオン → 4×4 行列に変換し state 更新
- ±90° ボタンは現在の回転行列に左から軸回転行列を掛ける
- `POST /api/convert` 時に JSON で送信

### 5-4. 完了条件
- FE-01〜FE-14 がすべてグリーン
- ローカルで「STL アップロード → 回転 → 変換 → ダウンロード」が手動操作で通る

---

## 6. Phase 5: テスト整備と CI/CD

### 6-1. テスト構成

| 種別 | ツール | 対応 ID | 場所 |
|------|--------|---------|------|
| 単体 | pytest | UT-01〜UT-13 | `backend/tests/unit/` |
| 結合 | pytest | IT-01〜IT-08 | `backend/tests/integration/` |
| UI | Vitest + RTL | FE-01〜FE-14 | `frontend/tests/` |
| E2E | Playwright | E2E-01〜E2E-06 | `tests/e2e/` |

### 6-2. CI/CD（GitHub Actions）

`.github/workflows/ci.yml`:
1. `backend-test`: pytest + カバレッジ計測（80% ゲート）
2. `frontend-test`: Vitest
3. `e2e-test`: docker-compose で全スタック起動 → Playwright 実行
4. `build-images`: PR マージ時に Docker イメージビルド・push

### 6-3. 品質ゲート
- QG-1〜QG-4, QG-6 は CI で自動化
- QG-5（実機テスト HW-01〜HW-03）はリリース前の手動チェックリストで管理

---

## 7. リスクと対応策

| # | リスク | 対応 |
|---|--------|------|
| R1 | 800 万ボクセルのメモリ消費（T2） | `uint8` グリッド、in-place 更新、ジョブ並行数制限 |
| R2 | 5 分以内の処理時間（非機能要件） | レイキャストを Numba JIT 化、必要なら並列化 |
| R3 | QR 読み取り失敗（T6） | F15 の黒画素保証ロジックを厳格化、QR モジュール最低 3 ボクセル制約（T4） |
| R4 | 80°近傍の極端な歪み（T7） | UI に照射角度警告（FE-14）、推奨範囲 70〜80°を強調表示 |
| R5 | エラー訂正 H の限界（T8） | F18 失敗時に「QR バージョンを下げる」ガイダンスを表示 |
| R6 | 光源がオブジェクト内部（T3） | API リクエスト時に幾何バリデーション、日本語エラー応答 |

---

## 8. マイルストーン

| Phase | 想定期間 | 完了判定 |
|-------|---------|---------|
| Phase 1 基盤構築 | 1〜2 日 | `docker compose up` でフロント・バック疎通 |
| Phase 2 コアロジック | 5〜7 日 | UT 全件グリーン、カバレッジ 80% |
| Phase 3 API 層 | 2〜3 日 | IT-01 がエンドツーエンドで成功 |
| Phase 4 UI | 5〜7 日 | FE 全件グリーン、手動 E2E が通る |
| Phase 5 テスト・CI | 2〜3 日 | E2E 全件グリーン、GitHub Actions 緑 |

---

## 9. 確定事項（ユーザー確認済み）

- 実装方針: **Phase 順に全部実装**
- 実行環境: **Docker 化（本番想定）**
- 非同期処理: **FastAPI BackgroundTasks**
