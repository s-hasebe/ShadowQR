/**
 * E2E-01〜E2E-06: ShadowQR 全画面フローテスト
 *
 * 前提: `docker compose up` でフロント(:5173)・バック(:8000) が起動済みであること。
 * CI では `.github/workflows/ci.yml` の e2e-test ジョブが docker compose を起動する。
 */
import { test, expect, request } from '@playwright/test'
import { makeBoxStlBuffer } from './helpers'
import { API_URL } from './playwright.config'

// ============================================================
// E2E-01: ページ表示と基本UI確認
// ============================================================
test.describe('E2E-01: ページ表示', () => {
  test('アプリが正常に読み込まれ主要パネルが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ShadowQR' })).toBeVisible()
    await expect(page.getByText('① STLアップロード')).toBeVisible()
    await expect(page.getByText('② QRコードテキスト')).toBeVisible()
    await expect(page.getByText('③ 投影パラメータ')).toBeVisible()
  })

  test('変換開始ボタンが初期状態で無効化されている', async ({ page }) => {
    await page.goto('/')
    const startBtn = page.getByRole('button', { name: /変換開始/ })
    await expect(startBtn).toBeDisabled()
  })

  test('ページタイトルに ShadowQR が含まれる', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ShadowQR/i)
  })
})

// ============================================================
// E2E-02: STLアップロードフロー
// ============================================================
test.describe('E2E-02: STLアップロード', () => {
  test('有効なSTLをアップロードするとファイル名が表示される', async ({ page }) => {
    await page.goto('/')
    const stlBuf = makeBoxStlBuffer(10)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'box_10mm.stl',
      mimeType: 'model/stl',
      buffer: stlBuf,
    })
    await expect(page.getByText('box_10mm.stl')).toBeVisible()
  })

  test('STLアップロード後にエラーが表示されない', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'box_10mm.stl',
      mimeType: 'model/stl',
      buffer: makeBoxStlBuffer(10),
    })
    await expect(page.getByText('ファイルが100MBを超えています。')).not.toBeVisible()
    await expect(page.getByText('STLファイルを選択してください。')).not.toBeVisible()
  })

  test('STL + QRテキスト入力後に変換開始ボタンが有効化される', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'box_10mm.stl',
      mimeType: 'model/stl',
      buffer: makeBoxStlBuffer(10),
    })
    await page.getByPlaceholder('https://example.com').fill('https://example.com')
    await expect(page.getByRole('button', { name: /変換開始/ })).toBeEnabled()
  })
})

// ============================================================
// E2E-03: QRテキスト入力とバリデーション
// ============================================================
test.describe('E2E-03: QRテキスト入力', () => {
  test('テキストを入力するとバイト数カウンタが更新される', async ({ page }) => {
    await page.goto('/')
    const textarea = page.getByPlaceholder('https://example.com')
    await textarea.fill('hello')
    await expect(page.getByText('5 / 2953 バイト')).toBeVisible()
  })

  test('空欄では 0 / 2953 バイト と表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('0 / 2953 バイト')).toBeVisible()
  })

  test('2953バイト超のテキストで警告が表示される', async ({ page }) => {
    await page.goto('/')
    const textarea = page.getByPlaceholder('https://example.com')
    await textarea.fill('a'.repeat(2954))
    await expect(page.getByText(/2954 \/ 2953 バイト/)).toBeVisible()
  })
})

// ============================================================
// E2E-04: パラメータパネル操作
// ============================================================
test.describe('E2E-04: パラメータパネル', () => {
  test('照射角度の表示が存在する', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/照射角度/)).toBeVisible()
  })

  test('エラー訂正レベルのセレクトがデフォルトで H になっている', async ({ page }) => {
    await page.goto('/')
    const select = page.getByRole('combobox')
    await expect(select).toHaveValue('H')
  })

  test('エラー訂正レベルを L に変更できる', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox').selectOption('L')
    await expect(page.getByRole('combobox')).toHaveValue('L')
  })

  test('ボクセル解像度入力フィールドが存在する', async ({ page }) => {
    await page.goto('/')
    const pitchInput = page.locator('.form-group').filter({ hasText: 'ボクセル解像度' }).locator('input')
    await expect(pitchInput).toBeVisible()
    await expect(pitchInput).toHaveValue('0.5')
  })
})

// ============================================================
// E2E-05: APIヘルスチェック
// ============================================================
test.describe('E2E-05: APIヘルスチェック', () => {
  test('GET /health が 200 OK {"status":"ok"} を返す', async () => {
    const ctx = await request.newContext({ baseURL: API_URL })
    const resp = await ctx.get('/health')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body).toEqual({ status: 'ok' })
    await ctx.dispose()
  })

  test('GET /api/result/nonexistent が 404 を返す', async () => {
    const ctx = await request.newContext({ baseURL: API_URL })
    const resp = await ctx.get('/api/result/nonexistent-id')
    expect(resp.status()).toBe(404)
    await ctx.dispose()
  })
})

// ============================================================
// E2E-06: 変換フロー（起動〜完了）
// ============================================================
test.describe('E2E-06: 変換フロー', () => {
  test('変換開始後に進捗バーが表示される', async ({ page }) => {
    await page.goto('/')

    // ボクセル解像度を粗くして高速化
    const pitchInput = page.locator('.form-group').filter({ hasText: 'ボクセル解像度' }).locator('input')
    await pitchInput.fill('3')
    await page.getByRole('combobox').selectOption('L')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'box_30mm.stl',
      mimeType: 'model/stl',
      buffer: makeBoxStlBuffer(30),
    })
    await page.getByPlaceholder('https://example.com').fill('https://example.com')
    await page.getByRole('button', { name: /変換開始/ }).click()

    // 変換中のボタンテキストまたは進捗パネルが現れること
    await expect(
      page.getByText('処理進捗').or(page.getByRole('button', { name: /処理中/ }))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('変換完了後に QR検証結果パネルが表示される', async ({ page }) => {
    await page.goto('/')

    // 高速設定
    const pitchInput = page.locator('.form-group').filter({ hasText: 'ボクセル解像度' }).locator('input')
    await pitchInput.fill('3')
    await page.getByRole('combobox').selectOption('L')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'box_30mm.stl',
      mimeType: 'model/stl',
      buffer: makeBoxStlBuffer(30),
    })
    await page.getByPlaceholder('https://example.com').fill('https://example.com')
    await page.getByRole('button', { name: /変換開始/ }).click()

    // パイプライン完了（completed or failed）を待つ（最大3分）
    await expect(
      page.getByText(/QRコード読み取り成功/).or(page.getByText(/読み取り失敗/)).or(page.getByText(/変換エラー/))
    ).toBeVisible({ timeout: 180_000 })
  })

  test('変換成功時にダウンロードボタンが表示される', async ({ page }) => {
    await page.goto('/')

    const pitchInput = page.locator('.form-group').filter({ hasText: 'ボクセル解像度' }).locator('input')
    await pitchInput.fill('3')
    await page.getByRole('combobox').selectOption('L')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'box_30mm.stl',
      mimeType: 'model/stl',
      buffer: makeBoxStlBuffer(30),
    })
    await page.getByPlaceholder('https://example.com').fill('https://example.com')
    await page.getByRole('button', { name: /変換開始/ }).click()

    // 結果パネル出現を待つ
    await expect(
      page.getByText(/QRコード読み取り成功/).or(page.getByText(/読み取り失敗/)).or(page.getByText(/変換エラー/))
    ).toBeVisible({ timeout: 180_000 })

    // ダウンロードボタンが存在すること（検証成否問わず）
    await expect(page.getByRole('button', { name: /STLをダウンロード/ })).toBeVisible()
  })
})
