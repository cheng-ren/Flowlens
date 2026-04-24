import { BrowserWindow, BrowserView, session } from 'electron'
import { join } from 'path'

let bv: BrowserView | null = null
let currentAccountId: string | null = null

export function openBrowserView(mainWindow: BrowserWindow, url: string, accountId?: string) {
  if (bv) closeBrowserView(mainWindow)
  
  currentAccountId = accountId || null
  const partition = accountId ? `persist:${accountId}` : 'persist:default'

  bv = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition
    }
  })
  mainWindow.setBrowserView(bv)
  
  // Float Mode: Bottom Right, 50% scale
  const bounds = mainWindow.getBounds()
  const width = 400
  const height = 400
  bv.setBounds({ x: bounds.width - width - 20, y: bounds.height - height - 40, width, height })
  bv.webContents.setZoomFactor(0.5)

  // Keep bounds updated on resize
  mainWindow.on('resize', () => {
    if (bv) {
      const bounds = mainWindow.getBounds()
      bv.setBounds({ x: bounds.width - width - 20, y: bounds.height - height - 40, width, height })
    }
  })

  bv.webContents.loadURL(url)
}

export async function extractAndSaveCookies(accountId: string): Promise<any[]> {
  const accountSession = session.fromPartition(`persist:${accountId}`)
  
  // Force flush cookies to disk before reading
  await accountSession.cookies.flushStore()
  
  const allCookies = await accountSession.cookies.get({})
  
  // Debug: log cookie names to main process terminal
  console.log(`[Cookie Debug] Account ${accountId} total cookies: ${allCookies.length}`)
  allCookies.forEach(c => console.log(`  name=${c.name} domain=${c.domain} value=${c.value?.substring(0, 30)}`))
  
  return allCookies
}

export function closeBrowserView(mainWindow: BrowserWindow) {
  if (bv) {
    mainWindow.removeBrowserView(bv)
    // @ts-ignore
    bv.webContents.destroy()
    bv = null
  }
}

export async function captureJDOrders() {
  if (!bv) throw new Error('Browser is not open')

  const extractScript = `
    (() => {
      try {
        const orders = Array.from(document.querySelectorAll('tbody[id^="tb-"]')).map((tbody) => {
          const orderIdEl = tbody.querySelector('.number a') || tbody.querySelector('[name="orderId"]');
          if (!orderIdEl) return null;
          
          const orderId = (orderIdEl.textContent || orderIdEl.getAttribute('value') || '').trim();
          
          const timeEl = tbody.querySelector('.dealtime');
          const time = timeEl ? timeEl.textContent.trim() : new Date().toISOString();
          
          const amountEl = tbody.querySelector('.amount .spmMoney') || tbody.querySelector('.amount span');
          const amount = amountEl ? parseFloat(amountEl.textContent.replace(/[^0-9.]/g, '')) || 0 : 0;
          
          // Collect all product titles in this order (multiple items)
          const titleEls = Array.from(tbody.querySelectorAll('.p-name'));
          const title = titleEls.map(t => t.textContent.trim()).join(' | ') || 'Unknown Item';

          return {
            id: 'jd_' + orderId,
            platform: 'jd',
            orderId: orderId,
            title: title,
            amount: amount,
            time: time,
            raw: tbody.innerHTML
          }
        }).filter(Boolean);

        // Deduplicate locally in JS
        const uniqueOrders = [];
        const seen = new Set();
        for (const order of orders) {
          if (!seen.has(order.orderId)) {
            seen.add(order.orderId);
            uniqueOrders.push(order);
          }
        }
        return uniqueOrders;
      } catch (e) {
        return { error: e.message };
      }
    })();
  `

  const data = await bv.webContents.executeJavaScript(extractScript)
  if (data?.error) {
    throw new Error('Parse error: ' + data.error)
  }
  return data
}

export async function goToNextJDPage(): Promise<boolean> {
  if (!bv) return false;
  const script = `
    (() => {
      const nextBtn = document.querySelector('a.next, .ui-pager-next');
      if (nextBtn && !nextBtn.className.includes('disabled') && nextBtn.style.display !== 'none') {
         nextBtn.click();
         return true;
      }
      return false;
    })();
  `;
  return await bv.webContents.executeJavaScript(script);
}

export function waitForPageLoad(): Promise<void> {
  return new Promise((resolve) => {
    if (!bv) return resolve();
    let isResolved = false;
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    }, 4000); // Wait 4 seconds maximum per page

    bv.webContents.once('did-finish-load', () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        // Add a small extra delay after load for JS render
        setTimeout(resolve, 1000); 
      }
    });
  });
}

