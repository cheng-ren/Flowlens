export const EXTRACT_JD_SCRIPT = `
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
        
        const titleEls = Array.from(tbody.querySelectorAll('.p-name'));
        const title = titleEls.map(function(t) { return t.textContent.trim(); }).join(' | ') || 'Unknown Item';
        
        const shopEl = tbody.querySelector('.shop-txt, .shop-name');
        const shopName = shopEl ? shopEl.textContent.trim() : '京东自营/其他';
        
        const statusEl = (function() {
          try {
            var xpStatus = document.evaluate(
              './/span[contains(@class,"order-status")]',
              tbody, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            if (xpStatus.singleNodeValue) return xpStatus.singleNodeValue;
          } catch(xe) {}
          return tbody.querySelector('.order-status, .status');
        })();
        const rawStatus = statusEl ? statusEl.textContent.trim() : '未知状态';
        const status = (rawStatus.includes('成功') || rawStatus.includes('完成')) ? '完成' : rawStatus;
        
        // 用 XPath 在 div.status 下找文本为「订单详情」的 <a>
        const detailUrl = (function() {
          try {
            var xpResult = document.evaluate(
              './/div[@class="status"]//a',
              tbody, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
            );
            for (var xi = 0; xi < xpResult.snapshotLength; xi++) {
              var aEl = xpResult.snapshotItem(xi);
              if (aEl && aEl.textContent && aEl.textContent.trim() === '订单详情') {
                var href = aEl.href || aEl.getAttribute('href') || '';
                if (href) return href;
              }
            }
          } catch(xe) {}
          // fallback: 原有 querySelector 方式
          var fbEl = tbody.querySelector('a[href*="item.action"], a[href*="details.jd.com"]');
          return fbEl ? fbEl.href : \`https://details.jd.com/normal/item.action?orderid=\${orderId}\`;
        })();
        
        const goodsNumEl = tbody.querySelector('.goods-number');
        const goodsNumMatch = goodsNumEl ? goodsNumEl.textContent.match(/\\d+/) : null;
        const quantity = goodsNumMatch ? goodsNumMatch[0] : '1';
        
        const totalAmountStr = amountEl ? amountEl.textContent.trim() : '0';
        const priceVal = parseFloat(totalAmountStr.replace(/[^0-9.]/g, '')) / parseInt(quantity);
        const randHex = Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
        
        const pcDiv = tbody.querySelector('.consignee.tooltip .pc');
        let rName = '', rPhone = '', rAddr = '';
        if (pcDiv) {
          const strongEl = pcDiv.querySelector('strong');
          rName = strongEl ? strongEl.textContent.trim() : '';
          const ps = pcDiv.querySelectorAll('p');
          if (ps.length >= 1) rAddr = ps[0].textContent.trim();
          if (ps.length >= 2) rPhone = ps[1].textContent.trim();
        }
        
        const pNameEl = tbody.querySelector('.p-name');
        const fallbackPName = pNameEl ? pNameEl.textContent.trim() : title;
        
        const fallbackDetail = {
          order_id: orderId,
          status: status,
          products: [{
            name: fallbackPName,
            price: priceVal.toString(),
            quantity: quantity,
            product_id: randHex
          }],
          shipping: {
            receiver_name: rName,
            receiver_phone: rPhone,
            receiver_address: rAddr,
            express_company: '京东快递'
          },
          financial: {
            total: totalAmountStr,
            paid: totalAmountStr,
            details: []
          },
          timeline: {
            order_time: time,
            pay_time: time
          },
          raw_html: tbody.innerHTML
        };

        return { id: 'jd_' + orderId, platform: 'jd', orderId: orderId, title: title, amount: amount, time: time, raw: tbody.innerHTML, shopName: shopName, status: status, detailUrl: detailUrl, fallbackDetail: fallbackDetail }
      }).filter(Boolean);
      const uniqueOrders = [];
      const seen = new Set();
      for (const order of orders) {
        if (!seen.has(order.orderId)) { seen.add(order.orderId); uniqueOrders.push(order); }
      }
      return uniqueOrders;
    } catch (e) {
      return { error: e.message };
    }
  })();
`;

export { EXTRACT_JD_DETAIL_SCRIPT, EXTRACT_TAOBAO_DETAIL_SCRIPT } from "./detailScripts";

export const NEXT_PAGE_SCRIPT = `
  (() => {
    const nextBtn = document.querySelector('a.next, .ui-pager-next');
    if (nextBtn && !nextBtn.className.includes('disabled') && nextBtn.style.display !== 'none') {
       nextBtn.click();
       return true;
    }
    return false;
  })();
`;

export const EXTRACT_TAOBAO_SCRIPT = `
  (() => {
    try {
      var containers = Array.from(document.querySelectorAll('.trade-container'));
      var orderContainers = containers.filter(function(c) {
        return c.querySelector('[class*="shopInfoOrderId"]') !== null;
      });
      var orders = orderContainers.map(function(c) {
        var idEl = c.querySelector('[class*="shopInfoOrderId"]');
        var orderId = idEl ? idEl.textContent.replace(/[^0-9]/g, '') : '';
        if (!orderId) return null;

        var timeEl = c.querySelector('[class*="shopInfoOrderTime"]');
        var time = timeEl ? timeEl.textContent.trim() : new Date().toISOString();

        var titleEls = Array.from(c.querySelectorAll('[class*="title--"]'));
        var title = titleEls.map(function(t) { return t.textContent.trim(); }).filter(Boolean).join(' | ') || 'Taobao Order';

        var amountEl = c.querySelector('[class*="trade-price-integer"] em, [class*="trade-price-integer"]') ||
                       c.querySelector('[class*="priceWrap"] em, [class*="price--"]');
        var amount = amountEl ? parseFloat((amountEl.textContent || '0').replace(/[^0-9.]/g, '')) || 0 : 0;

        var shopEl = c.querySelector('[class*="shopInfoName"]');
        var shopName = shopEl ? shopEl.textContent.trim() : '淘宝店铺';

        var statusTexts = ['交易成功', '交易关闭', '退款成功', '买家已付款', '等待买家付款', '充值成功'];
        var statusEl = Array.from(c.querySelectorAll('span, div')).find(function(el) {
          return el.childNodes.length === 1 && statusTexts.includes(el.textContent.trim());
        });
        var rawStatus = statusEl ? statusEl.textContent.trim() : '未知状态';
        var status = (rawStatus.includes('成功') || rawStatus.includes('完成')) ? '完成' : rawStatus;

        // 优先用 XPath 获取「查看详情」按钮的精确链接
        var detailUrl = (function() {
          try {
            var xpathResult = document.evaluate(
              './/span[@data-spm="order_detail"]/a/@href',
              c, null, XPathResult.STRING_TYPE, null
            );
            var href = xpathResult.stringValue ? xpathResult.stringValue.trim() : '';
            if (href) return href.startsWith('//') ? 'https:' + href : href;
          } catch(e) {}
          // fallback: 原有 querySelector 方式
          var detailLinkEl = c.querySelector('a[href*="trade.taobao.com/trade/detail"], a[href*="buyertrade.taobao.com/trade/detail"]');
          return detailLinkEl
            ? detailLinkEl.href
            : ('https://buyertrade.taobao.com/trade/detail/trade_item_detail.htm?bizOrderId=' + orderId);
        })();

        var priceEls = Array.from(c.querySelectorAll('[class*="price--"] em, [class*="priceWrap"] em'));
        var quantities = Array.from(c.querySelectorAll('[class*="quantity--"], [class*="count--"]'));
        var products = titleEls.map(function(titleEl, idx) {
          var priceStr = priceEls[idx] ? priceEls[idx].textContent.replace(/[^0-9.]/g, '') : '0';
          var qty = quantities[idx] ? quantities[idx].textContent.replace(/[^0-9]/g, '') || '1' : '1';
          var randHex = Array.from({length: 32}, function() { return Math.floor(Math.random()*16).toString(16); }).join('');
          return { name: titleEl.textContent.trim(), price: priceStr, quantity: qty, product_id: randHex };
        }).filter(function(p) { return p.name; });

        var fallbackDetail = {
          order_id: orderId,
          status: status,
          products: products.length > 0 ? products : [{ name: title, price: String(amount), quantity: '1', product_id: Array.from({length: 32}, function() { return Math.floor(Math.random()*16).toString(16); }).join('') }],
          shipping: { receiver_name: '', receiver_phone: '', receiver_address: '', express_company: '' },
          financial: { total: String(amount), paid: String(amount), details: [] },
          timeline: { order_time: time, pay_time: time },
          raw_html: c.innerHTML
        };

        return { id: 'tb_' + orderId, platform: 'taobao', orderId: orderId, title: title, amount: amount, time: time, raw: '', shopName: shopName, status: status, detailUrl: detailUrl, fallbackDetail: fallbackDetail };
      }).filter(Boolean);

      var uniqueOrders = [];
      var seen = new Set();
      for (var i = 0; i < orders.length; i++) {
        if (!seen.has(orders[i].orderId)) { seen.add(orders[i].orderId); uniqueOrders.push(orders[i]); }
      }
      return uniqueOrders;
    } catch (e) {
      return { error: e.message };
    }
  })();
`;


export const NEXT_PAGE_TAOBAO_SCRIPT = `
  (() => {
    var nextBtn = document.querySelector('.ant-pagination-next:not(.ant-pagination-disabled)');
    if (nextBtn) { nextBtn.click(); return true; }
    return false;
  })();
`;

export const getOrderUrl = (platform: string): string => {
  if (platform === "jd") return "https://order.jd.com/center/list.action?search=0&d=2&s=4096";
  if (platform === "taobao") return "https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm";
  return "";
};

/**
 * 生成京东按年份倒序的订单列表 URL 数组。
 * - 今年使用 d=2（京东约定的"今年内"参数）
 * - 往年依次使用 d=<year>，从 (currentYear-1) 一直到 2010
 */
export const getJDYearUrls = (): string[] => {
  const currentYear = new Date().getFullYear();
  const urls: string[] = [];
  urls.push("https://order.jd.com/center/list.action?search=0&d=2&s=4096");
  for (let year = currentYear - 1; year >= 2010; year--) {
    urls.push(`https://order.jd.com/center/list.action?search=0&d=${year}&s=4096`);
  }
  return urls;
};

/**
 * 按时间范围生成京东订单列表 URL 数组。
 * - "last_month" / "this_year" → 仅访问今年的 URL（d=2），靠提前停止翻页控制范围
 * - "2025" / "2024" 等具体年份 → 仅访问对应年份的 URL
 */
export const getJDUrlsForRange = (timeRange: string): string[] => {
  const currentYear = new Date().getFullYear();
  if (timeRange === "last_month" || timeRange === "this_year") {
    return ["https://order.jd.com/center/list.action?search=0&d=2&s=4096"];
  }
  const year = parseInt(timeRange, 10);
  if (!isNaN(year)) {
    const d = year === currentYear ? "2" : String(year);
    return [`https://order.jd.com/center/list.action?search=0&d=${d}&s=4096`];
  }
  return getJDYearUrls();
};

export interface TimeRangeCutoff {
  start: Date | null;
  end: Date | null;
}

/**
 * 根据时间范围标识返回 [start, end) 区间。
 * - null 表示无限制
 */
export const getTimeRangeCutoff = (timeRange: string): TimeRangeCutoff => {
  const now = new Date();
  if (timeRange === "last_month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return { start, end: null };
  }
  if (timeRange === "this_year") {
    return { start: new Date(now.getFullYear(), 0, 1), end: null };
  }
  const year = parseInt(timeRange, 10);
  if (!isNaN(year)) {
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }
  return { start: null, end: null };
};
