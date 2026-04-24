import { app, shell, BrowserWindow, ipcMain, session, net, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import * as fs from 'fs'

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
  try { db.exec('ALTER TABLE accounts ADD COLUMN avatar TEXT;') } catch (e) { }
  try { db.exec('ALTER TABLE taobao_order_details ADD COLUMN alipay_trade_no TEXT;') } catch (e) { }

}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
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
ipcMain.handle('import-alipay-excel', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '选择支付宝交易明细文件',
    properties: ['openFile'],
    filters: [{ name: 'Excel 文件', extensions: ['xls', 'xlsx'] }]
  })
  if (canceled || !filePaths.length) return { count: 0, canceled: true }

  const filePath = filePaths[0]
  const workbook = XLSX.readFile(filePath, { type: 'file', raw: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
  const { headers, dataRows } = findHeaderAndData(rows)
  if (!headers.length) return { count: 0, error: '未找到表头行，请确认是支付宝账单文件' }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO alipay_bills
    (id, trade_time, category, counterparty, counterparty_account, product, type, amount, payment_method, status, trade_no, merchant_order_no, remark, source_file, created_at)
    VALUES (@id, @trade_time, @category, @counterparty, @counterparty_account, @product, @type, @amount, @payment_method, @status, @trade_no, @merchant_order_no, @remark, @source_file, @created_at)
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
        created_at: new Date().toISOString()
      })
      count++
    }
    return count
  })
  const count = tx(dataRows)
  return { count }
})

ipcMain.handle('get-alipay-bills', () => {
  return db.prepare('SELECT * FROM alipay_bills ORDER BY trade_time DESC').all()
})

// ── 微信账单导入 ────────────────────────────────────────────────────────
ipcMain.handle('import-wechat-excel', async () => {
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
    (id, trade_time, trade_type, counterparty, product, type, amount, payment_method, status, trade_no, merchant_order_no, remark, source_file, created_at)
    VALUES (@id, @trade_time, @trade_type, @counterparty, @product, @type, @amount, @payment_method, @status, @trade_no, @merchant_order_no, @remark, @source_file, @created_at)
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
        created_at: new Date().toISOString()
      })
      count++
    }
    return count
  })
  const count = tx(dataRows)
  return { count }
})

ipcMain.handle('get-wechat-bills', () => {
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

ipcMain.handle('get-bank-transactions', () => {
  return db.prepare('SELECT * FROM bank_transactions ORDER BY trade_date DESC').all()
})

ipcMain.handle('ask-ollama', async (_, prompt: string) => {
  try {
    const cached = db.prepare('SELECT category FROM category_cache WHERE product_name = ?').get(prompt)
    if (cached && cached.category) {
      return cached.category
    }

    const categories = ["数码3C", "家用电器", "手机通讯", "电脑办公", "服饰鞋包", "美妆个护", "食品生鲜", "家居家装", "母婴用品", "图书文娱", "运动户外", "汽车用品", "医药健康", "宠物用品", "虚拟商品", "服务充值", "其他"];
    const systemPrompt = `你是一个专门对商品进行分类的助手。请将给定的商品名称归类到以下类别之一：[数码3C,家用电器,手机通讯,电脑办公,服饰鞋包,美妆个护,食品生鲜,家居家装,母婴用品,图书文娱,运动户外,汽车用品,医药健康,宠物用品,虚拟商品,服务/充值,其他]. 请仅输出匹配的分类名称，不要输出任何多余的解释、标点符号或前缀。`;

    // Note: net.fetch is native in Electron to bypass CORS or network constraints, but global fetch is also supported in Node 20.
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5',
        prompt: prompt,
        system: systemPrompt,
        stream: false,
        think: false
      })
    })

    if (!res.ok) {
      throw new Error('Ollama response not ok')
    }
    const json = await res.json()
    const responseText = json.response || ''

    // Find the first category that is mentioned in the response
    const matched = categories.find(c => responseText.includes(c))

    if (!matched) {
      console.log(`[Ollama Mismatch] Prompt: ${prompt.substring(0, 50)}... | Response: ${responseText}`);
    }

    const finalCategory = matched || '其他'
    db.prepare('INSERT OR REPLACE INTO category_cache (product_name, category) VALUES (?, ?)').run(prompt, finalCategory)
    
    return finalCategory
  } catch (err) {
    console.error('Ollama Error:', err)
    return '其他'
  }
})
