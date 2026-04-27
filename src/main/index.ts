import { app, shell, BrowserWindow, ipcMain, session, net, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as iconv from 'iconv-lite'

// 必须在 app.whenReady() 之前设置，Mac 菜单栏才能显示正确的中文名
app.name = '财流镜'

app.commandLine.appendSwitch('log-net-log-capture-mode', 'None')
app.commandLine.appendSwitch('disable-logging')
app.commandLine.appendSwitch('log-level', '3')

let db: any

function initDb() {
  const dbPath = join(app.getPath('userData'), 'flowlens.sqlite')
  db = new Database(dbPath)

  try {
    const tableInfo = db.pragma("table_info('jd_order_details')");
    if (tableInfo.some((col: any) => col.name === 'products_json')) {
      db.exec('DROP TABLE jd_order_details');
    }
  } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      family_id TEXT,
      name TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      platform TEXT,
      account_name TEXT,
      cookies TEXT,
      status TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS raw_orders (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      platform TEXT,
      order_id TEXT,
      title TEXT,
      amount REAL,
      time TEXT,
      raw_json TEXT
    );
    
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      type TEXT,
      name TEXT,
      amount REAL
    );
    
    CREATE TABLE IF NOT EXISTS dedup (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      source TEXT,
      match_key TEXT
    );
    
    CREATE TABLE IF NOT EXISTS category_cache (
      product_name TEXT PRIMARY KEY,
      category TEXT
    );
    
    CREATE TABLE IF NOT EXISTS jd_order_details (
      order_id TEXT,
      product_id TEXT,
      account_id TEXT,
      status TEXT,
      product_name TEXT,
      quantity TEXT,
      price REAL,
      category TEXT,
      receiver_name TEXT,
      receiver_phone TEXT,
      receiver_address TEXT,
      express_company TEXT,
      total_amount REAL,
      actual_paid REAL,
      paid_details TEXT,
      order_time TEXT,
      pay_time TEXT,
      raw_html TEXT,
      created_at TEXT,
      PRIMARY KEY (order_id, product_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_jd_order_details_unique 
    ON jd_order_details (order_id, product_id);

    CREATE TABLE IF NOT EXISTS taobao_order_details (
      order_id TEXT,
      alipay_trade_no TEXT,
      product_id TEXT,
      account_id TEXT,
      status TEXT,
      product_name TEXT,
      quantity TEXT,
      price REAL,
      category TEXT,
      receiver_name TEXT,
      receiver_phone TEXT,
      receiver_address TEXT,
      express_company TEXT,
      total_amount REAL,
      actual_paid REAL,
      paid_details TEXT,
      order_time TEXT,
      pay_time TEXT,
      raw_html TEXT,
      created_at TEXT,
      PRIMARY KEY (order_id, product_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_taobao_order_details_unique
    ON taobao_order_details (order_id, product_id);

    CREATE TABLE IF NOT EXISTS alipay_bills (
      id TEXT PRIMARY KEY,
      trade_time TEXT,
      category TEXT,
      counterparty TEXT,
      counterparty_account TEXT,
      product TEXT,
      type TEXT,
      amount REAL,
      payment_method TEXT,
      status TEXT,
      trade_no TEXT,
      merchant_order_no TEXT,
      remark TEXT,
      source_file TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS wechat_bills (
      id TEXT PRIMARY KEY,
      trade_time TEXT,
      trade_type TEXT,
      counterparty TEXT,
      product TEXT,
      type TEXT,
      amount REAL,
      payment_method TEXT,
      status TEXT,
      trade_no TEXT,
      merchant_order_no TEXT,
      remark TEXT,
      source_file TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      bank TEXT,
      trade_date TEXT,
      amount REAL,
      type TEXT,
      balance REAL,
      counterparty TEXT,
      description TEXT,
      source_file TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS bank_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      file_type TEXT,
      import_script TEXT,
      script_description TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `)

  try { db.exec('ALTER TABLE raw_orders ADD COLUMN account_id TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE raw_orders ADD COLUMN shop_name TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE raw_orders ADD COLUMN status TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE raw_orders ADD COLUMN detail_url TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE raw_orders ADD COLUMN fallback_detail TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE families ADD COLUMN avatar TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE accounts ADD COLUMN cookies TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE accounts ADD COLUMN status TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE accounts ADD COLUMN nickname TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE bank_profiles ADD COLUMN user_id TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE accounts ADD COLUMN avatar TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE taobao_order_details ADD COLUMN alipay_trade_no TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE alipay_bills ADD COLUMN user_id TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE wechat_bills ADD COLUMN user_id TEXT;') } catch (e) { }

}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('cc.dbao.flowlens')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDb()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import { openBrowserView, closeBrowserView, captureJDOrders, goToNextJDPage, waitForPageLoad } from './browser-controller'

// 渲染进程日志透传到终端
ipcMain.on('log', (_event, ...args) => {
  console.log('[renderer]', ...args)
})

// basic ipc
ipcMain.handle('get-orders', () => {
  return db.prepare('SELECT * FROM raw_orders ORDER BY time DESC').all()
})

// Family Management
ipcMain.handle('create-family', (_, name) => {
  const id = 'fam_' + Date.now()
  const avatar = name.charAt(0).toUpperCase()
  db.prepare('INSERT INTO families (id, name, avatar, created_at) VALUES (?, ?, ?, ?)').run(id, name, avatar, new Date().toISOString())
  return { id, name, avatar }
})
ipcMain.handle('get-families', () => {
  return db.prepare('SELECT * FROM families ORDER BY created_at DESC').all()
})
ipcMain.handle('delete-family', (_, familyId) => {
  // Cascading deletes manually since foreign keys might not be enabled
  const users = db.prepare('SELECT id FROM users WHERE family_id = ?').all(familyId)
  for (const user of users) {
    const accounts = db.prepare('SELECT id FROM accounts WHERE user_id = ?').all(user.id)
    for (const acc of accounts) {
      db.prepare('DELETE FROM raw_orders WHERE account_id = ?').run(acc.id)
      db.prepare('DELETE FROM accounts WHERE id = ?').run(acc.id)
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id)
  }
  db.prepare('DELETE FROM families WHERE id = ?').run(familyId)
  return true
})

// User Management
ipcMain.handle('create-user', (_, { familyId, name }) => {
  const id = 'usr_' + Date.now()
  db.prepare('INSERT INTO users (id, family_id, name, created_at) VALUES (?, ?, ?, ?)').run(id, familyId, name, new Date().toISOString())
  return { id, familyId, name }
})
ipcMain.handle('get-users', (_, familyId) => {
  return db.prepare('SELECT * FROM users WHERE family_id = ? ORDER BY created_at DESC').all(familyId)
})
ipcMain.handle('delete-user', (_, userId) => {
  const accounts = db.prepare('SELECT id FROM accounts WHERE user_id = ?').all(userId)
  for (const acc of accounts) {
    db.prepare('DELETE FROM raw_orders WHERE account_id = ?').run(acc.id)
    db.prepare('DELETE FROM accounts WHERE id = ?').run(acc.id)
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  return true
})

// Account Management
ipcMain.handle('create-account', (_, { userId, platform, accountName }) => {
  const id = 'acc_' + Date.now()
  db.prepare('INSERT INTO accounts (id, user_id, platform, account_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, platform, accountName, 'pending', new Date().toISOString())
  return { id, userId, platform, accountName, status: 'pending' }
})
ipcMain.handle('get-accounts', (_, userId) => {
  return db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId)
})
ipcMain.handle('delete-account', (_, accountId) => {
  db.prepare('DELETE FROM raw_orders WHERE account_id = ?').run(accountId)
  db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId)
  return true
})
ipcMain.handle('update-account-status', (_, { accountId, status, cookies }) => {
  db.prepare('UPDATE accounts SET status = ?, cookies = ? WHERE id = ?').run(status, cookies, accountId)
})

const normalizeStatus = (s: string): string => {
  if (!s) return s
  return (s.includes('成功') || s.includes('完成')) ? '完成' : s
}

/**
 * 将任意来源的价格值转成两位小数浮点数。
 * 去除所有货币符号（¥ ￥ $ € £ 元 等）及千分位逗号，保留数字、小数点和负号。
 */
const formatPrice = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0.00
  const str = String(val)
    .replace(/[¥￥$€£₩₹元]/g, '')   // 常见货币符号
    .replace(/,/g, '')               // 千分位逗号
    .replace(/[^\d.-]/g, '')         // 其余非数字字符兜底
    .trim()
  const num = parseFloat(str)
  return isNaN(num) ? 0.00 : Number(num.toFixed(2))
}

ipcMain.handle('save-orders', (_, { orders, accountId }) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO raw_orders (id, account_id, platform, order_id, title, amount, time, raw_json, shop_name, status, detail_url, fallback_detail)
    VALUES (@id, @accountId, @platform, @orderId, @title, @amount, @time, @raw, @shopName, @status, @detailUrl, @fallbackDetailJson)
  `)
  const transaction = db.transaction((ords: any[]) => {
    for (const order of ords) {
      insert.run({
        ...order,
        accountId,
        detailUrl: order.detailUrl || '',
        status: normalizeStatus(order.status),
        fallbackDetailJson: order.fallbackDetail ? JSON.stringify(order.fallbackDetail) : null,
      })
    }
  })
  transaction(orders)
  return orders.length
})

// 查询某账户已存在的 order_id 集合（用于增量采集判断是否有新订单）
ipcMain.handle('get-account-order-ids', (_, accountId: string) => {
  return new Set(
    db.prepare('SELECT order_id FROM raw_orders WHERE account_id = ?').all(accountId).map((r: any) => r.order_id)
  )
})

// 查询某账户所有 raw_orders（含 detail_url、fallback_detail），供第二阶段全量补详情使用
ipcMain.handle('get-account-orders', (_, accountId: string) => {
  return db.prepare('SELECT order_id, detail_url, fallback_detail, title, amount FROM raw_orders WHERE account_id = ? ORDER BY time DESC').all(accountId)
})

// 查询已有详情数据的 order_id 集合（用于第二阶段跳过）
ipcMain.handle('get-orders-with-detail', (_, accountId: string, platform: string) => {
  const table = platform === 'taobao' ? 'taobao_order_details' : 'jd_order_details'
  return new Set(
    db.prepare(`SELECT DISTINCT order_id FROM ${table} WHERE account_id = ?`).all(accountId).map((r: any) => r.order_id)
  )
})

import { extractAndSaveCookies } from './browser-controller'
ipcMain.handle('save-account-cookies', async (_, accountId) => {
  const account = db.prepare('SELECT platform FROM accounts WHERE id = ?').get(accountId)
  const cookies = await extractAndSaveCookies(accountId)

  // Safe decode: URL decode first, then handle \uXXXX backslash-u sequences
  const safeDecode = (val: string): string => {
    if (!val) return ''
    try {
      // Step 1: standard URL decode (%XX → chars)
      let decoded = decodeURIComponent(val)
      // Step 2: handle \uXXXX JavaScript-style escapes (Taobao _nk_ after URL decode)
      decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      return decoded
    } catch {
      // If decodeURIComponent fails, try raw \uXXXX replacement on original val
      try {
        return val.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
      } catch { return val }
    }
  }

  let isValid = false
  let nickname = ''

  if (account.platform === 'jd') {
    const pinCookie = cookies.find(c => c.name === 'pin' && c.domain === '.jd.com' && c.value)
    const unickCookie = cookies.find(c => c.name === 'unick' && c.domain === '.jd.com' && c.value)
    const ptPin = cookies.find(c => c.name === 'pt_pin' && c.value)

    if (pinCookie && pinCookie.value) {
      isValid = true
      nickname = unickCookie ? safeDecode(unickCookie.value) : safeDecode(pinCookie.value)
    } else if (ptPin && ptPin.value) {
      isValid = true
      nickname = safeDecode(ptPin.value)
    }
  } else if (account.platform === 'taobao') {
    const unb = cookies.find(c => c.name === 'unb' && c.domain === '.taobao.com' && c.value)
    // lid has clean UTF-8 URL encoding (%E4%BB...) which decodes directly
    const lidCookie = cookies.find(c => c.name === 'lid' && (c.domain === '.login.taobao.com' || c.domain === '.taobao.com') && c.value)
    const nkCookie = cookies.find(c => c.name === '_nk_' && c.domain === '.taobao.com' && c.value)

    if (unb && unb.value) {
      isValid = true
      if (lidCookie) {
        nickname = safeDecode(lidCookie.value)
      } else if (nkCookie) {
        nickname = safeDecode(nkCookie.value)
      } else {
        nickname = '淘宝用户'
      }
    }
  }

  const avatar = nickname ? Array.from(nickname)[0].toUpperCase() : ''
  const status = isValid ? 'valid' : 'invalid'

  db.prepare('UPDATE accounts SET status = ?, cookies = ?, nickname = ?, avatar = ? WHERE id = ?').run(status, JSON.stringify(cookies), nickname, avatar, accountId)
  return status
})

ipcMain.handle('save-jd-order-detail', (_, detail) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO jd_order_details 
    (order_id, product_id, account_id, status, product_name, quantity, price, category, receiver_name, receiver_phone, receiver_address, express_company, total_amount, actual_paid, paid_details, order_time, pay_time, raw_html, created_at)
    VALUES (@order_id, @product_id, @account_id, @status, @product_name, @quantity, @price, @category, @receiver_name, @receiver_phone, @receiver_address, @express_company, @total_amount, @actual_paid, @paid_details, @order_time, @pay_time, @raw_html, @created_at)
  `)

  const created_at = new Date().toISOString()

  const transaction = db.transaction((products: any[]) => {
    for (const p of products) {
      insert.run({
        order_id: detail.order_id || '',
        product_id: p.product_id || p.name || 'unknown',
        account_id: detail.account_id || '',
        status: normalizeStatus(detail.status || ''),
        product_name: p.name || '',
        quantity: p.quantity || '',
        price: formatPrice(p.price),
        category: p.category || '',
        receiver_name: detail.shipping?.receiver_name || '',
        receiver_phone: detail.shipping?.receiver_phone || '',
        receiver_address: detail.shipping?.receiver_address || '',
        express_company: detail.shipping?.express_company || '',
        total_amount: formatPrice(detail.financial?.total),
        actual_paid: formatPrice(detail.financial?.paid),
        paid_details: detail.financial?.details ? JSON.stringify(detail.financial.details) : '',
        order_time: detail.timeline?.order_time || '',
        pay_time: detail.timeline?.pay_time || '',
        raw_html: detail.raw_html || '',
        created_at
      })
    }
  })

  if (detail.products && detail.products.length > 0) {
    transaction(detail.products)
  } else {
    // If no products, just insert one row with empty product info to save the order metadata
    transaction([{ product_id: 'no_product' }])
  }

  return true
})

ipcMain.handle('save-taobao-order-detail', (_, detail) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO taobao_order_details
    (order_id, alipay_trade_no, product_id, account_id, status, product_name, quantity, price, category, receiver_name, receiver_phone, receiver_address, express_company, total_amount, actual_paid, paid_details, order_time, pay_time, raw_html, created_at)
    VALUES (@order_id, @alipay_trade_no, @product_id, @account_id, @status, @product_name, @quantity, @price, @category, @receiver_name, @receiver_phone, @receiver_address, @express_company, @total_amount, @actual_paid, @paid_details, @order_time, @pay_time, @raw_html, @created_at)
  `)

  const created_at = new Date().toISOString()

  const transaction = db.transaction((products: any[]) => {
    for (const p of products) {
      insert.run({
        order_id: (detail.order_id || '').replace(/[^0-9]/g, '') || '',
        alipay_trade_no: detail.alipay_trade_no || '',
        product_id: p.product_id || p.name || 'unknown',
        account_id: detail.account_id || '',
        status: normalizeStatus(detail.status || ''),
        product_name: p.name || '',
        quantity: p.quantity || '',
        price: formatPrice(p.price),
        category: p.category || '',
        receiver_name: detail.shipping?.receiver_name || '',
        receiver_phone: detail.shipping?.receiver_phone || '',
        receiver_address: detail.shipping?.receiver_address || '',
        express_company: detail.shipping?.express_company || '',
        total_amount: formatPrice(detail.financial?.total),
        actual_paid: formatPrice(detail.financial?.paid),
        paid_details: detail.financial?.details ? JSON.stringify(detail.financial.details) : '',
        order_time: detail.timeline?.order_time || '',
        pay_time: detail.timeline?.pay_time || '',
        raw_html: detail.raw_html || '',
        created_at
      })
    }
  })

  if (detail.products && detail.products.length > 0) {
    transaction(detail.products)
  } else {
    transaction([{ product_id: 'no_product' }])
  }

  return true
})

// ── 按平台查询订单 ───────────────────────────────────────────────────────
ipcMain.handle('get-orders-by-platform', (_, platform: string) => {
  // 优先从 raw_orders 读（有爬虫数据时）
  const rawRows = db.prepare('SELECT * FROM raw_orders WHERE platform = ? ORDER BY time DESC').all(platform)
  if (rawRows.length > 0) {
    console.log(`[get-orders-by-platform] raw_orders platform=${platform}, rows=${rawRows.length}`)
    return rawRows
  }

  // raw_orders 无数据时，从详情表聚合（每个 order_id 取一行）
  const table = platform === 'taobao' ? 'taobao_order_details' : 'jd_order_details'
  const rows = db.prepare(`
    SELECT
      order_id                                   AS order_id,
      '${platform}'                              AS platform,
      account_id,
      COALESCE(MAX(order_time), MAX(pay_time), MAX(created_at)) AS time,
      MAX(status)                                AS status,
      MAX(actual_paid)                           AS amount,
      GROUP_CONCAT(product_name, ' | ')          AS title,
      ''                                         AS shop_name
    FROM ${table}
    GROUP BY order_id
    ORDER BY time DESC
  `).all()
  console.log(`[get-orders-by-platform] detail_table=${table}, rows=${rows.length}`)
  return rows
})

// ── Excel/PDF 解析辅助函数 ────────────────────────────────────────────────

/**
 * 从 sheet_to_json 的 raw rows 中自动找到含 "交易时间" 的表头行，
 * 返回 { headers, dataRows } 以便后续解析。
 */
function findHeaderAndData(rows: any[][]): { headers: string[]; dataRows: any[][] } {
  let headerIdx = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || []
    if (row.some((c: any) => String(c ?? '').trim().includes('交易时间'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return { headers: [], dataRows: [] }
  const headers = (rows[headerIdx] || []).map((h: any) => String(h ?? '').trim())
  const dataRows = rows.slice(headerIdx + 1).filter((r: any[]) => r && r.length > 0 && String(r[0] ?? '').trim())
  return { headers, dataRows }
}

function rowToObj(headers: string[], row: any[]): Record<string, string> {
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
  return obj
}

// ── 支付宝账单导入 ────────────────────────────────────────────────────────
ipcMain.handle('import-alipay-excel', async (_, userId?: string) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '选择支付宝交易明细文件',
    properties: ['openFile'],
    filters: [{ name: '支付宝账单', extensions: ['xls', 'xlsx', 'csv'] }]
  })
  if (canceled || !filePaths.length) return { count: 0, canceled: true }

  const filePath = filePaths[0]
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''

  let rows: any[][]
  if (ext === 'csv') {
    // 支付宝 CSV 为 GBK 编码，先解码再按行解析
    const rawBuf = fs.readFileSync(filePath)
    const text = iconv.decode(rawBuf, 'GBK')
    const lines = text.split(/\r?\n/)
    rows = lines.map((line) => {
      // 简单 CSV 分割（支付宝 CSV 字段内无换行/引号嵌套，直接按逗号分割）
      return line.split(',').map((cell) => cell.trim())
    })
  } else {
    const workbook = XLSX.readFile(filePath, { type: 'file', raw: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as any[][]
  }

  const { headers, dataRows } = findHeaderAndData(rows)
  if (!headers.length) return { count: 0, error: '未找到表头行，请确认是支付宝账单文件' }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO alipay_bills
    (id, trade_time, category, counterparty, counterparty_account, product, type, amount, payment_method, status, trade_no, merchant_order_no, remark, source_file, created_at, user_id)
    VALUES (@id, @trade_time, @category, @counterparty, @counterparty_account, @product, @type, @amount, @payment_method, @status, @trade_no, @merchant_order_no, @remark, @source_file, @created_at, @user_id)
  `)
  // 支付宝不同版本列名有差异，兼容多种写法
  const pick = (o: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) { if (o[k] !== undefined && o[k] !== '') return o[k] }
    return ''
  }
  const tx = db.transaction((rows: any[][]) => {
    let count = 0
    for (const row of rows) {
      const o = rowToObj(headers, row)
      // 订单号末尾可能有 \t，需要彻底清除空白
      const tradeNo = (pick(o, '交易订单号') || '').replace(/\s+/g, '')
      if (!tradeNo || tradeNo === '交易订单号') continue
      // 金额列名：「金额(元)」「金额（元）」「金额」均兼容
      const amountRaw = pick(o, '金额(元)', '金额（元）', '金额')
      const amountStr = amountRaw.replace(/[^0-9.]/g, '')
      insert.run({
        id: 'alipay_' + tradeNo,
        trade_time: pick(o, '交易时间') || '',
        category: pick(o, '交易分类') || '',
        counterparty: pick(o, '交易对方') || '',
        counterparty_account: pick(o, '对方账号') || '',
        // 商品列名：「商品名称」或「商品说明」
        product: pick(o, '商品名称', '商品说明', '商品') || '',
        type: pick(o, '收/支') || '',
        amount: parseFloat(amountStr) || 0,
        payment_method: pick(o, '收/付款方式', '付款方式') || '',
        status: pick(o, '交易状态') || '',
        trade_no: tradeNo,
        merchant_order_no: (pick(o, '商家订单号') || '').replace(/\s+/g, ''),
        remark: pick(o, '备注') || '',
        source_file: filePath,
        created_at: new Date().toISOString(),
        user_id: userId || null
      })
      count++
    }
    return count
  })
  const count = tx(dataRows)
  return { count }
})

ipcMain.handle('get-alipay-bills', (_, userId?: string) => {
  if (userId) {
    return db.prepare('SELECT * FROM alipay_bills WHERE user_id = ? ORDER BY trade_time DESC').all(userId)
  }
  return db.prepare('SELECT * FROM alipay_bills ORDER BY trade_time DESC').all()
})

// ── 微信账单导入 ────────────────────────────────────────────────────────
ipcMain.handle('import-wechat-excel', async (_, userId?: string) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '选择微信支付账单文件',
    properties: ['openFile'],
    filters: [{ name: 'Excel 文件', extensions: ['xlsx', 'xls'] }]
  })
  if (canceled || !filePaths.length) return { count: 0, canceled: true }

  const filePath = filePaths[0]
  const workbook = XLSX.readFile(filePath, { type: 'file', raw: false, password: '' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
  const { headers, dataRows } = findHeaderAndData(rows)
  if (!headers.length) return { count: 0, error: '未找到表头行，请确认是微信账单文件' }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO wechat_bills
    (id, trade_time, trade_type, counterparty, product, type, amount, payment_method, status, trade_no, merchant_order_no, remark, source_file, created_at, user_id)
    VALUES (@id, @trade_time, @trade_type, @counterparty, @product, @type, @amount, @payment_method, @status, @trade_no, @merchant_order_no, @remark, @source_file, @created_at, @user_id)
  `)
  const tx = db.transaction((rows: any[][]) => {
    let count = 0
    for (const row of rows) {
      const o = rowToObj(headers, row)
      const tradeNo = (o['交易单号'] || '').replace(/\s/g, '')
      if (!tradeNo || tradeNo === '交易单号') continue
      const amountStr = (o['金额(元)'] || '0').replace(/[^0-9.¥]/g, '').replace('¥', '')
      insert.run({
        id: 'wechat_' + tradeNo,
        trade_time: o['交易时间'] || '',
        trade_type: o['交易类型'] || '',
        counterparty: o['交易对方'] || '',
        product: o['商品'] || '',
        type: o['收/支'] || '',
        amount: parseFloat(amountStr) || 0,
        payment_method: o['支付方式'] || '',
        status: o['当前状态'] || '',
        trade_no: tradeNo,
        merchant_order_no: o['商户单号'] || '',
        remark: o['备注'] || '',
        source_file: filePath,
        created_at: new Date().toISOString(),
        user_id: userId || null
      })
      count++
    }
    return count
  })
  const count = tx(dataRows)
  return { count }
})

ipcMain.handle('get-wechat-bills', (_, userId?: string) => {
  if (userId) {
    return db.prepare('SELECT * FROM wechat_bills WHERE user_id = ? ORDER BY trade_time DESC').all(userId)
  }
  return db.prepare('SELECT * FROM wechat_bills ORDER BY trade_time DESC').all()
})

// ── 招商银行 PDF 流水导入 ─────────────────────────────────────────────────
ipcMain.handle('import-bank-pdf', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '选择招商银行交易流水 PDF',
    properties: ['openFile'],
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
  })
  if (canceled || !filePaths.length) return { count: 0, canceled: true }

  const filePath = filePaths[0]
  const dataBuffer = fs.readFileSync(filePath)

  let text = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(dataBuffer)
    text = result.text
  } catch (e: any) {
    return { count: 0, error: '解析 PDF 失败: ' + e.message }
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO bank_transactions
    (id, bank, trade_date, amount, type, balance, counterparty, description, source_file, created_at)
    VALUES (@id, @bank, @trade_date, @amount, @type, @balance, @counterparty, @description, @source_file, @created_at)
  `)

  // 招商银行 PDF 流水格式（无空格连写）：
  //   YYYY-MM-DDCNYamountbalancedesc对手信息
  // 例：2025-01-01CNY-50.001,139.78银联快捷支付
  //     2025-01-03CNY22,076.8522,786.63代发工资
  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)

  // 匹配：日期 + CNY + 带符号金额（2位小数）+ 余额（2位小数）+ 剩余描述
  const txRe = /^(\d{4}-\d{2}-\d{2})CNY(-?\d[\d,]*\.\d{2})(\d[\d,]*\.\d{2})(.*)/

  const tx = db.transaction((lines: string[]) => {
    let count = 0
    for (const line of lines) {
      const m = line.match(txRe)
      if (!m) continue

      const tradeDate = m[1]
      const rawAmount  = parseFloat(m[2].replace(/,/g, ''))
      const balance    = parseFloat(m[3].replace(/,/g, ''))
      const description = m[4].trim()
      const amount = Math.abs(rawAmount)
      const type   = rawAmount < 0 ? '支出' : '收入'
      const id     = `bank_${tradeDate}_${count}_${rawAmount}`

      insert.run({
        id,
        bank: '招商银行',
        trade_date: tradeDate,
        amount,
        type,
        balance,
        counterparty: '',
        description,
        source_file: filePath,
        created_at: new Date().toISOString()
      })
      count++
    }
    return count
  })
  const count = tx(lines)
  return { count }
})

ipcMain.handle('get-bank-transactions', (_, profileId?: string) => {
  if (profileId) {
    const profile = db.prepare('SELECT name FROM bank_profiles WHERE id = ?').get(profileId) as { name: string } | undefined
    if (profile) {
      return db.prepare('SELECT * FROM bank_transactions WHERE bank = ? ORDER BY trade_date DESC').all(profile.name)
    }
  }
  return db.prepare('SELECT * FROM bank_transactions ORDER BY trade_date DESC').all()
})

// ── 银行档案管理 IPC ───────────────────────────────────────────────────────

ipcMain.handle('bank-get-profiles', (_, userId?: string) => {
  if (userId) {
    return db.prepare('SELECT * FROM bank_profiles WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  }
  // 不传 userId 时返回全部（供侧边栏导航使用）
  return db.prepare('SELECT * FROM bank_profiles ORDER BY created_at DESC').all()
})

ipcMain.handle('bank-create-profile', (_, { name, userId }: { name: string; userId: string }) => {
  const id = 'bp_' + Date.now()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO bank_profiles (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, name, userId || null, now, now)
  return { id, name, user_id: userId || null, import_script: null, file_type: null, script_description: null }
})

ipcMain.handle('bank-update-script', (_, { id, script, description, fileType }: { id: string; script: string; description: string; fileType: string }) => {
  db.prepare('UPDATE bank_profiles SET import_script = ?, script_description = ?, file_type = ?, updated_at = ? WHERE id = ?')
    .run(script, description, fileType, new Date().toISOString(), id)
  return { ok: true }
})

ipcMain.handle('bank-delete-profile', (_, id: string) => {
  const profile = db.prepare('SELECT name FROM bank_profiles WHERE id = ?').get(id) as { name: string } | undefined
  if (profile) {
    db.prepare('DELETE FROM bank_transactions WHERE bank = ?').run(profile.name)
  }
  db.prepare('DELETE FROM bank_profiles WHERE id = ?').run(id)
  return { ok: true }
})

// 从 LLM 响应中提取 JavaScript 代码块
function extractScriptFromResponse(response: string): string {
  const codeBlockMatch = response.match(/```(?:javascript|js)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const funcMatch = response.match(/function\s+parseTransactions\s*\([\s\S]*/)
  if (funcMatch) return funcMatch[0].trim()
  return response.trim()
}

// 在沙箱中运行银行解析脚本
function runBankScript(script: string, fileContent: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vm = require('vm')
  const sandbox: any = {
    fileContent,
    result: null,
    console: { log: () => {}, error: () => {}, warn: () => {} },
    Math, JSON, Date, Number, String, Array, Object, RegExp, parseInt, parseFloat, isNaN, isFinite,
  }
  const context = vm.createContext(sandbox)
  const code = `${script}\nresult = parseTransactions(fileContent);`
  vm.runInContext(code, context, { timeout: 15000 })
  if (!Array.isArray(sandbox.result)) throw new Error('脚本未返回数组')
  return sandbox.result
}

/**
 * 使用 pdfjs 按文字坐标重建表格行，输出 TSV（制表符分隔）格式。
 * 相比 pdf-parse 的纯文本流，可以保留"日期 | 货币 | 金额 | 余额 | 摘要 | 对手方"的列结构。
 *
 * 多行单元格处理：PDF 表格中"对手方"列可能有换行，导致文字出现在相邻 Y 坐标上。
 * 使用前瞻算法：碎片行在下一个事务行前 → 预挂载；在上一个事务行后 → 追加。
 */
async function extractPdfAsTable(filePath: string): Promise<string> {
  // pdf-parse 内置的 pdfjs v2
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfjsLib = require('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js')
  const buf = fs.readFileSync(filePath)
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise

  const rawLines: string[] = []
  const Y_TOLERANCE = 3  // 同一行的 Y 坐标容差（像素）

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const textContent = await page.getTextContent()

    // 收集所有文字块的坐标
    const items: { x: number; y: number; text: string }[] = []
    for (const item of textContent.items as any[]) {
      const text = (item.str ?? '').trim()
      if (!text) continue
      items.push({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        text,
      })
    }

    // 按 Y 坐标聚合为行（误差 ≤ Y_TOLERANCE 视为同一行）
    const rows = new Map<number, { x: number; text: string }[]>()
    for (const item of items) {
      let rowKey = item.y
      for (const [ky] of rows) {
        if (Math.abs(ky - item.y) <= Y_TOLERANCE) { rowKey = ky; break }
      }
      if (!rows.has(rowKey)) rows.set(rowKey, [])
      rows.get(rowKey)!.push({ x: item.x, text: item.text })
    }

    // PDF 坐标 Y 轴向上，降序排列 = 从上到下
    const sortedYs = [...rows.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const cols = rows.get(y)!.sort((a, b) => a.x - b.x)
      rawLines.push(cols.map(c => c.text).join('\t'))
    }

    if (pageNum < doc.numPages) rawLines.push(`--- 第${pageNum}页结束 ---`)
  }

  // ── 后处理：修复多行单元格（单元格内换行导致碎片行） ─────────────────────────
  // 问题根源：PDF 表格中"对手方"单元格若有2行文字，其第1行的 Y 坐标往往高于
  // 同一交易行的日期/金额（因为日期/金额在单元格里垂直居中），
  // 导致碎片行出现在交易行之前。
  // 算法：前瞻判断——碎片行的下一行是事务行 → 预挂载到该事务；否则追加到上一事务。
  const DATE_ROW_RE = /^\d{4}[-\/]\d{2}[-\/]\d{2}\t/

  // 把对手方碎片追加到 lines 数组中最近一条事务行的末尾
  function attachToLastTx(lines: string[], fragment: string): void {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (DATE_ROW_RE.test(lines[i])) {
        const cols = lines[i].split('\t')
        cols[cols.length - 1] = (cols[cols.length - 1] + fragment).trim()
        lines[i] = cols.join('\t')
        return
      }
    }
  }

  const processed: string[] = []
  const preBuffer: string[] = []  // 预挂载缓冲：等待附加到下一条事务行
  let inDataSection = false       // 已经遇到第一条事务行（之前是表头/元数据）

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const trimmed = line.trim()

    // 页面分隔符：先把预挂载缓冲作为后追加处理，再输出分隔符
    if (trimmed.startsWith('---')) {
      if (preBuffer.length > 0) {
        preBuffer.forEach(f => attachToLastTx(processed, f))
        preBuffer.length = 0
      }
      processed.push(line)
      continue
    }

    if (!trimmed) continue

    if (DATE_ROW_RE.test(line)) {
      // 事务行：把预挂载缓冲拼到对手方列最前面
      inDataSection = true
      const cols = line.split('\t')
      if (preBuffer.length > 0) {
        while (cols.length < 6) cols.push('')
        cols[cols.length - 1] = (preBuffer.join('') + cols[cols.length - 1]).trim()
        preBuffer.length = 0
      }
      processed.push(cols.join('\t'))
    } else if (!inDataSection) {
      // 表头/元数据区域，原样保留
      processed.push(line)
    } else {
      // 碎片行：前瞻决定归属
      let nextLineIsDate = false
      for (let j = i + 1; j < rawLines.length; j++) {
        const nt = rawLines[j].trim()
        if (!nt || nt.startsWith('---')) continue
        nextLineIsDate = DATE_ROW_RE.test(rawLines[j])
        break
      }
      if (nextLineIsDate) {
        // 下一行是事务行 → 这是那行的对手方"行首"，预挂载
        preBuffer.push(trimmed)
      } else {
        // 下一行不是事务行（或已无更多行）→ 追加到上一条事务
        if (preBuffer.length > 0) {
          preBuffer.forEach(f => attachToLastTx(processed, f))
          preBuffer.length = 0
        }
        attachToLastTx(processed, trimmed)
      }
    }
  }
  // 刷新剩余预挂载缓冲（最后一条事务的对手方尾部）
  if (preBuffer.length > 0) {
    preBuffer.forEach(f => attachToLastTx(processed, f))
  }

  return processed.join('\n')
}

// 读取文件内容（公共辅助，供多个 handler 调用）
async function readBankFileContent(filePath: string): Promise<{ fileContent: string; fileType: string; error?: string }> {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  try {
    if (ext === 'pdf') {
      try {
        // 优先使用位置感知的表格提取，输出 TSV 格式
        const tableText = await extractPdfAsTable(filePath)
        console.log('[PDF] 使用位置感知提取，前5行：\n' + tableText.split('\n').slice(0, 5).join('\n'))
        return { fileContent: tableText, fileType: 'pdf' }
      } catch (e: any) {
        // 降级到 pdf-parse 纯文本
        console.warn('[PDF] 位置提取失败，降级到 pdf-parse:', e.message)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse')
        const buf = fs.readFileSync(filePath)
        const parsed = await pdfParse(buf)
        return { fileContent: parsed.text, fileType: 'pdf' }
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.readFile(filePath)
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      return { fileContent: XLSX.utils.sheet_to_csv(firstSheet), fileType: 'xlsx' }
    } else {
      return { fileContent: fs.readFileSync(filePath, 'utf-8'), fileType: ext === 'csv' ? 'csv' : 'txt' }
    }
  } catch (e: any) {
    return { fileContent: '', fileType: ext, error: '读取文件失败: ' + e.message }
  }
}

// 调用 LLM 并附带超时（120 秒）
async function callLlmWithTimeout(prompt: string, timeoutMs = 120_000): Promise<string> {
  const { baseUrl: rawBase, apiKey, model } = getLlmConfigFromDb()
  // 去掉末尾多余的斜杠，避免拼出 .../v1//chat/completions
  const baseUrl = rawBase.replace(/\/+$/, '')
  const isOllama = baseUrl.includes('11434') || !apiKey

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  console.log('\n' + '='.repeat(60))
  console.log(`[LLM] 请求开始  model=${model}  mode=${isOllama ? 'Ollama' : 'OpenAI-compat'}`)
  const targetUrl = isOllama ? `${baseUrl}/api/generate` : `${baseUrl}/chat/completions`
  console.log(`[LLM] URL: ${targetUrl}`)
  console.log('[LLM] ── Prompt ──────────────────────────────────────────')
  console.log(prompt)
  console.log('[LLM] ──────────────────────────────────────────────────────')

  const t0 = Date.now()

  try {
    let rawResponse = ''
    if (isOllama) {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false, think: false }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Ollama error: HTTP ${res.status}${body ? ' — ' + body.slice(0, 200) : ''}`)
      }
      const json = await res.json() as { response?: string }
      rawResponse = json.response || ''
    } else {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        // 注意：think: false 是 Ollama 专属参数，不传给 OpenAI-compat 接口
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`LLM API error: HTTP ${res.status}${body ? ' — ' + body.slice(0, 300) : ''}`)
      }
      const json = await res.json() as { choices?: { message?: { content?: string } }[] }
      rawResponse = json.choices?.[0]?.message?.content || ''
    }

    console.log(`[LLM] ── Response（耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s）────────────────────`)
    console.log(rawResponse)
    console.log('='.repeat(60) + '\n')

    return rawResponse
  } catch (e: any) {
    console.error(`[LLM] 请求失败（耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s）: ${e.message}`)
    if (e.name === 'AbortError') throw new Error(`AI 请求超时（超过 ${timeoutMs / 1000} 秒），请检查大模型服务是否正常运行`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// 第一步：打开文件选择对话框并读取文件内容（不调用 LLM，速度快）
ipcMain.handle('bank-pick-file', async (_, { profileId }: { profileId: string }) => {
  const profile = db.prepare('SELECT * FROM bank_profiles WHERE id = ?').get(profileId) as any
  if (!profile) return { error: '银行档案不存在' }

  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: `选择 ${profile.name} 流水文件`,
    properties: ['openFile'],
    filters: [{ name: '支持的文件', extensions: ['pdf', 'csv', 'xlsx', 'xls', 'txt'] }],
  })
  if (canceled || !filePaths.length) return { canceled: true }

  const filePath = filePaths[0]
  const { fileContent, fileType, error } = await readBankFileContent(filePath)
  if (error) return { error }

  // 若已有可用脚本，直接返回解析结果（跳过 LLM）
  if (profile.import_script) {
    try {
      const rows = runBankScript(profile.import_script, fileContent)
      if (rows.length > 0) {
        return {
          filePath, fileType, fileContent,
          script: profile.import_script,
          previewRows: rows.slice(0, 15), totalRows: rows.length,
          fromCache: true,
        }
      }
    } catch (_) { /* 旧脚本失效，继续走 LLM */ }
  }

  // 没有可用脚本，返回文件信息（由前端决定何时触发 LLM）
  return { filePath, fileType, fileContent, needsScript: true, fromCache: false }
})

// 构建银行流水解析 Prompt
function buildBankPrompt(fileType: string, sampleContent: string): string {
  const isPdf = fileType === 'pdf'
  const pdfNote = isPdf ? `
【PDF 提取说明】此内容是按文字坐标重建的 TSV（制表符分隔）格式，每行各列之间用 Tab（\\t）分隔。
例如：2025-01-01\\tCNY\\t-50.00\\t1,139.78\\t银联快捷支付\\t国网汇通金财公司 110284003005
解析时请按 \\t 分割各行，识别日期列（YYYY-MM-DD 或 YYYYMMDD 格式）、货币列（CNY）、
金额列（数字，可带符号和千分位逗号）、余额列、摘要列、对手方列。
多页之间有"--- 第N页结束 ---"分隔行，可跳过。
` : ''

  return `你是银行流水文件解析专家。分析下面的银行流水文件内容（${fileType.toUpperCase()} 格式${isPdf ? '，按坐标重建为 TSV' : ''}），编写 JavaScript 函数来解析它。
${pdfNote}
文件内容（前200行）：
\`\`\`
${sampleContent}
\`\`\`

要求：生成名为 parseTransactions 的 JavaScript 函数
- 参数：fileContent（字符串，文件完整文本）
- 返回：数组，每个元素包含：
  * date: 日期（YYYY-MM-DD 格式字符串）
  * amount: 金额（正数，number 类型，去掉逗号和货币符号）
  * type: "收入" 或 "支出"（金额为正则收入，负则支出；或根据借贷方向列判断）
  * balance: 余额（number，没有则为 0）
  * description: 摘要（string，去首尾空格）
  * counterparty: 对手方（string，没有则为空字符串）
- 只能使用 JavaScript 标准内置对象（不能 require/import）
- 忽略标题行、空行、汇总行（通常含"合计"/"总计"/"页面分隔"字样）
- 金额去掉千分位逗号后再转 number，并取绝对值赋给 amount

只输出 JavaScript 函数代码，不要有任何解释文字，格式：
\`\`\`javascript
function parseTransactions(fileContent) {
  // 解析逻辑
  return transactions;
}
\`\`\``
}

// 第二步：调用 LLM 生成解析脚本（耗时，独立 IPC 便于前端展示进度）
ipcMain.handle('bank-generate-script', async (_, {
  filePath, fileType, fileContent,
}: { filePath: string; fileType: string; fileContent: string }) => {
  const lines = fileContent.split('\n')
  const sampleContent = lines.slice(0, 200).join('\n')

  console.log(`[bank-generate-script] fileType=${fileType}  总行数=${lines.length}  样本行数=${Math.min(lines.length, 200)}`)
  console.log('[bank-generate-script] 样本前20行：\n' + lines.slice(0, 20).join('\n'))

  const prompt = buildBankPrompt(fileType, sampleContent)

  try {
    const rawResponse = await callLlmWithTimeout(prompt)
    const scriptCode = extractScriptFromResponse(rawResponse)
    if (!scriptCode) return { error: '大模型未能生成有效的解析脚本，请检查大模型配置或文件内容' }

    // 首次执行脚本
    let rows: any[] = []
    let scriptError = ''
    try {
      rows = runBankScript(scriptCode, fileContent)
    } catch (e: any) {
      scriptError = e.message
    }

    // 脚本执行失败 → 携带错误信息重试一次
    if (scriptError) {
      console.log(`[bank-generate-script] 脚本执行失败，带错误重试：${scriptError}`)
      const retryPrompt = `${prompt}

上一次生成的脚本执行时报错：
\`\`\`
${scriptError}
\`\`\`
请修复错误，重新生成完整的 parseTransactions 函数。只输出代码，不要解释。`
      try {
        const retryResponse = await callLlmWithTimeout(retryPrompt)
        const retryScript = extractScriptFromResponse(retryResponse)
        if (retryScript) {
          try {
            rows = runBankScript(retryScript, fileContent)
            return { script: retryScript, previewRows: rows.slice(0, 15), totalRows: rows.length }
          } catch (e2: any) {
            return { script: retryScript, scriptError: e2.message, previewRows: [], totalRows: 0 }
          }
        }
      } catch (_) { /* 重试失败，返回第一次结果 */ }
      return { script: scriptCode, scriptError, previewRows: [], totalRows: 0 }
    }

    return { script: scriptCode, previewRows: rows.slice(0, 15), totalRows: rows.length }
  } catch (e: any) {
    return { error: e.message || 'AI 分析失败' }
  }
})


// 用指定脚本重新预览文件（用户修改脚本后调用）
ipcMain.handle('bank-preview-with-script', async (_, { filePath, script, fileType }: { filePath: string; script: string; fileType: string }) => {
  const { fileContent, error } = await readBankFileContent(filePath)
  if (error) return { ok: false, error }
  try {
    const rows = runBankScript(script, fileContent)
    return { ok: true, previewRows: rows.slice(0, 15), totalRows: rows.length }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

// 用户确认后正式导入银行流水
ipcMain.handle('bank-import-confirmed', async (_, { profileId, filePath, script, fileType }: { profileId: string; filePath: string; script: string; fileType: string }) => {
  const profile = db.prepare('SELECT * FROM bank_profiles WHERE id = ?').get(profileId) as any
  if (!profile) return { error: '银行档案不存在' }

  const { fileContent, error: readError } = await readBankFileContent(filePath)
  if (readError) return { error: readError }

  let transactions: any[]
  try {
    transactions = runBankScript(script, fileContent)
  } catch (e: any) {
    return { error: '脚本执行失败: ' + e.message }
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO bank_transactions
    (id, bank, trade_date, amount, type, balance, counterparty, description, source_file, created_at)
    VALUES (@id, @bank, @trade_date, @amount, @type, @balance, @counterparty, @description, @source_file, @created_at)
  `)

  const tx = db.transaction((txns: any[]) => {
    let count = 0
    for (let i = 0; i < txns.length; i++) {
      const t = txns[i]
      if (!t.date || t.amount === undefined) continue
      insert.run({
        id: `bank_${profileId}_${t.date}_${i}_${t.amount}`,
        bank: profile.name,
        trade_date: String(t.date),
        amount: Math.abs(Number(t.amount) || 0),
        type: t.type === '收入' ? '收入' : '支出',
        balance: Number(t.balance) || 0,
        counterparty: String(t.counterparty || ''),
        description: String(t.description || ''),
        source_file: filePath,
        created_at: new Date().toISOString(),
      })
      count++
    }
    return count
  })

  const count = tx(transactions)

  // 保存脚本到银行档案
  db.prepare('UPDATE bank_profiles SET import_script = ?, file_type = ?, updated_at = ? WHERE id = ?')
    .run(script, fileType, new Date().toISOString(), profileId)

  return { ok: true, count }
})

const DEFAULT_LLM_CONFIG = {
  baseUrl: 'http://localhost:11434',
  apiKey: '',
  model: 'qwen2.5:7b',
}

function getLlmConfigFromDb() {
  const row = (key: string) => {
    const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return r?.value ?? null
  }
  return {
    baseUrl: row('llm_base_url') ?? DEFAULT_LLM_CONFIG.baseUrl,
    apiKey:  row('llm_api_key')  ?? DEFAULT_LLM_CONFIG.apiKey,
    model:   row('llm_model')    ?? DEFAULT_LLM_CONFIG.model,
  }
}

ipcMain.handle('get-llm-config', () => getLlmConfigFromDb())

ipcMain.handle('save-llm-config', (_, config: { baseUrl: string; apiKey: string; model: string }) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  upsert.run('llm_base_url', config.baseUrl.trim() || DEFAULT_LLM_CONFIG.baseUrl)
  upsert.run('llm_api_key',  config.apiKey.trim())
  upsert.run('llm_model',    config.model.trim() || DEFAULT_LLM_CONFIG.model)
  return { ok: true }
})

ipcMain.handle('test-llm-config', async (_, config: { baseUrl: string; apiKey: string; model: string }) => {
  const baseUrl  = (config.baseUrl.trim() || DEFAULT_LLM_CONFIG.baseUrl).replace(/\/+$/, '')
  const apiKey   = config.apiKey.trim()
  const model    = config.model.trim() || DEFAULT_LLM_CONFIG.model
  const isOllama = baseUrl.includes('11434') || !apiKey

  console.log(`[LLM-test] mode=${isOllama ? 'Ollama' : 'OpenAI-compat'}  url=${baseUrl}  model=${model}`)

  try {
    if (isOllama) {
      const url = `${baseUrl}/api/generate`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: '你好', stream: false, think: false })
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`)
      }
      const json = await res.json() as { response?: string; error?: string }
      if (json.error) throw new Error(json.error)
      console.log('[LLM-test] 成功，回复:', (json.response || '').slice(0, 60))
      return { ok: true, reply: (json.response || '').slice(0, 80) }
    } else {
      const url = `${baseUrl}/chat/completions`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: '你好，请用一句话回复我' }],
          stream: false,
          max_tokens: 50,
        })
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 300) : ''}`)
      }
      const json = await res.json() as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
      if (json.error) throw new Error(json.error.message || '未知错误')
      const reply = json.choices?.[0]?.message?.content || ''
      console.log('[LLM-test] 成功，回复:', reply.slice(0, 60))
      return { ok: true, reply: reply.slice(0, 80) }
    }
  } catch (err: any) {
    console.error('[LLM-test] 失败:', err?.message || String(err))
    return { ok: false, error: err?.message || String(err) }
  }
})

// ── 数据分析 IPC ──────────────────────────────────────────────────────────

/** 返回各数据源中出现过的所有年份（降序），供前端构建年份选择器 */
ipcMain.handle('get-analytics-years', () => {
  const sets: Set<string> = new Set()
  const queries: Array<{ sql: string }> = [
    { sql: "SELECT DISTINCT substr(time,1,4) as y FROM raw_orders WHERE time GLOB '20[0-9][0-9]-*'" },
    { sql: "SELECT DISTINCT substr(trade_time,1,4) as y FROM alipay_bills WHERE trade_time GLOB '20[0-9][0-9]-*'" },
    { sql: "SELECT DISTINCT substr(trade_time,1,4) as y FROM wechat_bills WHERE trade_time GLOB '20[0-9][0-9]-*'" },
    { sql: "SELECT DISTINCT substr(trade_date,1,4) as y FROM bank_transactions WHERE trade_date GLOB '20[0-9][0-9]-*'" },
  ]
  for (const q of queries) {
    try {
      const rows = db.prepare(q.sql).all() as { y: string }[]
      rows.forEach(r => { if (r.y) sets.add(r.y) })
    } catch (_) { }
  }
  return Array.from(sets).sort((a, b) => b.localeCompare(a)) // 降序
})

/** 总览统计：各数据源在指定年份的条数与金额 */
ipcMain.handle('get-analytics-overview', (_, year: string) => {
  const y = year || new Date().getFullYear().toString()
  const yGlob = `${y}-%`
  const orders = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM raw_orders WHERE time LIKE ?"
  ).get(yGlob) as { count: number; total: number }
  const alipay = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),0) as expense, COALESCE(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),0) as income FROM alipay_bills WHERE trade_time LIKE ?"
  ).get(yGlob) as any
  const wechat = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),0) as expense, COALESCE(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),0) as income FROM wechat_bills WHERE trade_time LIKE ?"
  ).get(yGlob) as any
  const bank = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),0) as expense, COALESCE(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),0) as income FROM bank_transactions WHERE trade_date LIKE ?"
  ).get(yGlob) as any
  return { orders, alipay, wechat, bank }
})

/** 月度趋势：指定年份各渠道的每月收支（YYYY-MM 粒度） */
ipcMain.handle('get-monthly-trend', (_, year: string) => {
  const y = year || new Date().getFullYear().toString()
  const yGlob = `${y}-%`
  const alipay = db.prepare(`
    SELECT substr(trade_time,1,7) as month,
      ROUND(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),2) as expense,
      ROUND(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),2) as income
    FROM alipay_bills
    WHERE trade_time LIKE ?
    GROUP BY month ORDER BY month
  `).all(yGlob)
  const wechat = db.prepare(`
    SELECT substr(trade_time,1,7) as month,
      ROUND(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),2) as expense,
      ROUND(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),2) as income
    FROM wechat_bills
    WHERE trade_time LIKE ?
    GROUP BY month ORDER BY month
  `).all(yGlob)
  const bank = db.prepare(`
    SELECT substr(trade_date,1,7) as month,
      ROUND(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),2) as expense,
      ROUND(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),2) as income
    FROM bank_transactions
    WHERE trade_date LIKE ?
    GROUP BY month ORDER BY month
  `).all(yGlob)
  const ecommerce = db.prepare(`
    SELECT substr(time,1,7) as month,
      ROUND(SUM(amount),2) as expense,
      0 as income
    FROM raw_orders
    WHERE time LIKE ? AND amount > 0
    GROUP BY month ORDER BY month
  `).all(yGlob)
  return { alipay, wechat, bank, ecommerce }
})

/** 电商平台订单分布（指定年份，按平台汇总条数和金额） */
ipcMain.handle('get-platform-stats', (_, year: string) => {
  const y = year || new Date().getFullYear().toString()
  return db.prepare(`
    SELECT platform, COUNT(*) as count, ROUND(COALESCE(SUM(amount),0),2) as total
    FROM raw_orders
    WHERE amount > 0 AND time LIKE ?
    GROUP BY platform
    ORDER BY total DESC
  `).all(`${y}-%`)
})

/** 银行分布统计（指定年份，按 bank 字段汇总条数和支出金额） */
ipcMain.handle('get-bank-stats', (_, year: string) => {
  const y = year || new Date().getFullYear().toString()
  return db.prepare(`
    SELECT bank, COUNT(*) as count,
      ROUND(COALESCE(SUM(CASE WHEN type='支出' THEN amount ELSE 0 END),0),2) as expense,
      ROUND(COALESCE(SUM(CASE WHEN type='收入' THEN amount ELSE 0 END),0),2) as income
    FROM bank_transactions
    WHERE trade_date LIKE ? AND bank IS NOT NULL AND bank != ''
    GROUP BY bank
    ORDER BY expense DESC
  `).all(`${y}-%`)
})

/** 商品分类统计（指定年份，合并京东 + 淘宝详情表 + 支付宝账单，按消费金额排序） */
ipcMain.handle('get-category-stats', (_, year: string) => {
  const y = year || new Date().getFullYear().toString()
  const yGlob = `${y}-%`
  return db.prepare(`
    SELECT category, COUNT(*) as count, ROUND(SUM(amount),2) as total
    FROM (
      SELECT COALESCE(NULLIF(category,''),'其他') as category, price as amount
        FROM jd_order_details WHERE price > 0 AND order_time LIKE ?
      UNION ALL
      SELECT COALESCE(NULLIF(category,''),'其他') as category, price as amount
        FROM taobao_order_details WHERE price > 0 AND order_time LIKE ?
      UNION ALL
      SELECT COALESCE(NULLIF(TRIM(category),''),'其他') as category, amount
        FROM alipay_bills WHERE type = '支出' AND amount > 0 AND trade_time LIKE ?
    )
    GROUP BY category
    ORDER BY total DESC
    LIMIT 20
  `).all(yGlob, yGlob, yGlob)
})

/** 资产流转数据：银行/支付宝/微信的收支分类，供前端绘制桑基图 */
ipcMain.handle('get-asset-flow', (_, year: string) => {
  const y = year || new Date().getFullYear().toString()
  const yGlob = `${y}-%`
  try {
    const q = (sql: string, ...args: any[]) => (db.prepare(sql).get(...args) as any)?.v ?? 0

    // 银行
    const bankIn  = q(`SELECT COALESCE(SUM(amount),0) as v FROM bank_transactions WHERE type='收入' AND trade_date LIKE ?`, yGlob)
    const bankOut = q(`SELECT COALESCE(SUM(amount),0) as v FROM bank_transactions WHERE type='支出' AND trade_date LIKE ?`, yGlob)

    // 支付宝
    const alipayIn = q(`SELECT COALESCE(SUM(amount),0) as v FROM alipay_bills WHERE type='收入' AND trade_time LIKE ?`, yGlob)
    const alipayByCategory: Array<{ cat: string; v: number }> = db.prepare(`
      SELECT COALESCE(NULLIF(TRIM(category),''),'其他') as cat,
             ROUND(COALESCE(SUM(amount),0),2) as v
      FROM alipay_bills WHERE type='支出' AND amount > 0 AND trade_time LIKE ?
      GROUP BY cat HAVING v > 0 ORDER BY v DESC
    `).all(yGlob) as any

    // 微信
    const wechatIn = q(`SELECT COALESCE(SUM(amount),0) as v FROM wechat_bills WHERE type='收入' AND trade_time LIKE ?`, yGlob)
    const wechatByType: Array<{ cat: string; v: number }> = db.prepare(`
      SELECT COALESCE(NULLIF(TRIM(trade_type),''),'其他') as cat,
             ROUND(COALESCE(SUM(amount),0),2) as v
      FROM wechat_bills WHERE type='支出' AND amount > 0 AND trade_time LIKE ?
      GROUP BY cat HAVING v > 0 ORDER BY v DESC
    `).all(yGlob) as any

    return { bankIn, bankOut, alipayIn, alipayByCategory, wechatIn, wechatByType }
  } catch (e: any) {
    console.error('[get-asset-flow]', e?.message)
    return { bankIn: 0, bankOut: 0, alipayIn: 0, alipayByCategory: [], wechatIn: 0, wechatByType: [] }
  }
})

ipcMain.handle('ask-ollama', async (_, prompt: string) => {
  try {
    const cached = db.prepare('SELECT category FROM category_cache WHERE product_name = ?').get(prompt) as { category: string } | undefined
    if (cached?.category) return cached.category

    const { baseUrl, apiKey, model } = getLlmConfigFromDb()
    const categories = ["数码3C", "家用电器", "手机通讯", "电脑办公", "服饰鞋包", "美妆个护", "食品生鲜", "家居家装", "母婴用品", "图书文娱", "运动户外", "汽车用品", "医药健康", "宠物用品", "虚拟商品", "服务充值", "其他"]
    const systemPrompt = `你是一个专门对商品进行分类的助手。请将给定的商品名称归类到以下类别之一：[数码3C,家用电器,手机通讯,电脑办公,服饰鞋包,美妆个护,食品生鲜,家居家装,母婴用品,图书文娱,运动户外,汽车用品,医药健康,宠物用品,虚拟商品,服务/充值,其他]. 请仅输出匹配的分类名称，不要输出任何多余的解释、标点符号或前缀。`

    const isOllama = baseUrl.includes('11434') || !apiKey

    let responseText = ''

    if (isOllama) {
      // Ollama 原生格式
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, system: systemPrompt, stream: false, think: false })
      })
      if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
      const json = await res.json() as { response?: string }
      responseText = json.response || ''
    } else {
      // OpenAI 兼容格式（DeepSeek / 硅基流动 / 任意 OpenAI-compatible API）
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt },
          ],
          stream: false,
        })
      })
      if (!res.ok) throw new Error(`LLM API error: ${res.status}`)
      const json = await res.json() as { choices?: { message?: { content?: string } }[] }
      responseText = json.choices?.[0]?.message?.content || ''
    }

    const matched = categories.find(c => responseText.includes(c))
    if (!matched) console.log(`[LLM Mismatch] Prompt: ${prompt.substring(0, 50)}... | Response: ${responseText}`)

    const finalCategory = matched || '其他'
    db.prepare('INSERT OR REPLACE INTO category_cache (product_name, category) VALUES (?, ?)').run(prompt, finalCategory)
    return finalCategory
  } catch (err) {
    console.error('LLM Error:', err)
    return '其他'
  }
})
