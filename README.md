# ShadowQR

**光を当てると壁にQRコードの影が映る 3D オブジェクトを生成するツール**

STL ファイルをアップロードし、任意のテキスト・URL を指定するだけで、光を当てたときに壁面へ QR コードの影を投影する 3D モデル（STL）を自動生成します。

---

## 概要

ShadowQR は「影を使った情報埋め込み」を実現するツールです。

1. 入力 STL メッシュをボクセルグリッドに変換
2. 指定した光源位置から逆射影変換（ホモグラフィ）で QR コードパターンをボクセル空間へマッピング
3. 影を作るべき領域（QR の黒セル）のみボクセルを温存し、それ以外を彫り出し
4. メッシュを再構築・QR 読み取り検証して STL をダウンロード

```
入力STL + QRテキスト → [影彫刻アルゴリズム] → 影でQRが映るSTL
```

---

## スクリーンショット

> *(デプロイ後のスクリーンショットをここに追加)*

---

## 機能

- **STL アップロード** — ドラッグ&ドロップ対応（最大 100 MB）
- **3D 回転プレビュー** — React Three Fiber でリアルタイム表示・回転操作
- **投影パラメータ設定** — 光源位置・壁面法線・解像度・QR サイズを自由に調整
- **リアルタイム進捗** — WebSocket でステップごとの進捗を表示
- **QR 検証** — 生成 STL の影画像を OpenCV でシミュレートし、実際に QR が読めるか自動確認
- **STL ダウンロード** — 検証成功時のみダウンロード可

---

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│  Frontend (React + Vite + Three.js)         │
│  - UploadZone / QRTextInput / ParamPanel    │
│  - InputStlViewer / OutputStlViewer         │
│  - ShadowSimulator / VerifyResult           │
└──────────────┬──────────────────────────────┘
               │ HTTP / WebSocket
┌──────────────▼──────────────────────────────┐
│  Backend (FastAPI + Python 3.11)            │
│                                             │
│  POST /api/convert ──► pipeline             │
│  WS   /api/progress/{job_id}                │
│  GET  /api/result/{job_id}                  │
│  GET  /api/download/{job_id}                │
│                                             │
│  Processing Pipeline:                       │
│  F10 QR生成 → F11 ボクセル化               │
│  → F12 壁座標系 → F13 逆ホモグラフィ       │
│  → F14/F15 レイキャスト → F16/F17 メッシュ │
│  → F18 QR検証                              │
└─────────────────────────────────────────────┘
```

### 処理パイプライン詳細

| ステップ | 処理内容 |
|--------|---------|
| F10 | QR コードビットマップ生成 |
| F11 | STL → ボクセルグリッド変換（回転行列適用） |
| F12 | 壁面座標系の構築（Gram-Schmidt 正規直交化） |
| F13 | 逆透視変換で QR パターンをボクセル空間へ投影 |
| F14/F15 | DDA レイキャスト：白画素=彫刻、黒画素=保存 |
| F16/F17 | Marching Cubes でボクセル → メッシュ再構築 |
| F18 | 影画像シミュレーション & QR 読み取り検証 |

---

## 技術スタック

### Frontend
| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| React | 18.3 | UI フレームワーク |
| TypeScript | 5.4 | 型安全 |
| Vite | 5.3 | ビルドツール |
| Three.js | 0.165 | 3D レンダリング |
| @react-three/fiber | 8.16 | React × Three.js |
| @react-three/drei | 9.105 | 3D ユーティリティ |
| Zustand | 4.5 | 状態管理 |

### Backend
| ライブラリ | 用途 |
|-----------|------|
| FastAPI | Web API・WebSocket |
| NumPy / Numba | 数値計算・JIT 最適化 |
| trimesh | STL 読み込み・ボクセル化 |
| scikit-image | Marching Cubes |
| qrcode | QR コード生成 |
| OpenCV | 影画像シミュレーション |
| pyzbar | QR コード読み取り検証 |
| numpy-stl | STL エクスポート |

---

## セットアップ

### 必要環境

- Docker / Docker Compose
- または: Node.js 20+・Python 3.11+

### Docker で起動（推奨）

```bash
git clone https://github.com/s-hasebe/ShadowQR.git
cd ShadowQR
docker compose up --build
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8000

### ローカル開発

#### バックエンド

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

#### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

`vite.config.ts` の dev proxy が `/api` → `http://backend:8000` へ転送します。

---

## 使い方

1. **STL をアップロード** — ドラッグ&ドロップまたはクリックして STL ファイルを選択
2. **QR テキスト入力** — URL やテキストを入力（最大 2953 バイト）
3. **パラメータ設定** — 光源位置・壁面法線・解像度を調整
4. **向き調整** — 3D ビューアでモデルの向きを設定
5. **変換開始** — ボタンクリックで処理開始、進捗をリアルタイム確認
6. **ダウンロード** — QR 検証成功後に STL をダウンロード

### 推奨パラメータ

| パラメータ | 推奨値 | 説明 |
|-----------|--------|------|
| 照射角度 | 70〜80° | 壁面に対する光の入射角（自動計算） |
| QR エラー訂正 | H | 最高レベルで読み取り成功率が向上 |
| ボクセル解像度 | 0.5〜1.0 mm | 細かいほど精度が上がるが処理が遅くなる |

---

## API リファレンス

### `POST /api/convert`

変換ジョブを投稿します。

**Request:** `multipart/form-data`

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `stl_file` | File | 入力 STL ファイル（最大 100 MB） |
| `qr_text` | string | QR コードに埋め込むテキスト |
| `params` | JSON string | 変換パラメータ（後述） |

**パラメータ JSON:**

```json
{
  "light": [0, 50, 150],
  "wall_normal": [0, 0, -1],
  "wall_offset": 500,
  "qr_size": 100,
  "voxel_pitch": 0.5,
  "qr_error_level": "H",
  "rotation_matrix": [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
}
```

**Response:**
```json
{ "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

### `WS /api/progress/{job_id}`

進捗を WebSocket でストリーミングします。

```json
{ "step": "voxelize", "progress": 0.3, "message": "ボクセル化中..." }
```

### `GET /api/result/{job_id}`

ジョブ結果を取得します。

```json
{
  "status": "completed",
  "qr_verified": true,
  "qr_decoded_text": "https://example.com",
  "warning": null,
  "error": null
}
```

### `GET /api/download/{job_id}`

検証済み STL ファイルをダウンロードします（`qr_verified: true` 時のみ）。

---

## 開発

### テスト

```bash
# バックエンド
cd backend
pytest --cov=app --cov-report=term-missing

# フロントエンド
cd frontend
npm run test
```

### 型チェック

```bash
cd frontend
npm run type-check
```

### ビルド

```bash
cd frontend
npm run build
```

---

## ライセンス

MIT License

---

## 作者

[s-hasebe](https://github.com/s-hasebe)
