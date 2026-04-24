import type { DetailExtractConfig } from "./extractors";

/**
 * 根据配置生成注入到 webview 的订单详情提取脚本。
 * 配置以 JSON 形式嵌入脚本，运行时逐一尝试 XPath / CSS 选择器，取第一个非空值。
 */
export function buildDetailScript(config: DetailExtractConfig): string {
  const cfg = JSON.stringify(config);

  return `
  (() => {
    try {
      const CFG = ${cfg};

      /* ── 运行时工具函数 ─────────────────────────────────────────── */

      /** XPath 取单个字符串，支持 text() / @attr 轴 */
      const xStr = (xpath, ctx) => {
        try {
          const r = document.evaluate(xpath, ctx || document, null, XPathResult.STRING_TYPE, null);
          return r.stringValue ? r.stringValue.trim() : '';
        } catch(e) { return ''; }
      };

      /** XPath 取节点列表 */
      const xNodes = (xpath, ctx) => {
        try {
          const r = document.evaluate(xpath, ctx || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          const ns = [];
          for (let i = 0; i < r.snapshotLength; i++) ns.push(r.snapshotItem(i));
          return ns;
        } catch(e) { return []; }
      };

      /**
       * 从 FieldConfig 取单字符串：
       * 依次尝试 xpaths（取第一个非空），再依次尝试 selectors（textContent）
       */
      const getField = (field, ctx) => {
        if (!field) return '';
        for (const xp of (field.xpaths || [])) {
          const v = xStr(xp, ctx);
          if (v) return v;
        }
        for (const sel of (field.selectors || [])) {
          try {
            const el = (ctx || document).querySelector(sel);
            const v = el ? el.textContent.trim() : '';
            if (v) return v;
          } catch(e) {}
        }
        return '';
      };

      /**
       * 从 FieldConfig 取节点列表：
       * 依次尝试 xpaths（取第一个非空列表），再依次尝试 selectors（querySelectorAll）
       */
      const getNodes = (field, ctx) => {
        if (!field) return [];
        for (const xp of (field.xpaths || [])) {
          const ns = xNodes(xp, ctx);
          if (ns.length) return ns;
        }
        for (const sel of (field.selectors || [])) {
          try {
            const els = Array.from((ctx || document).querySelectorAll(sel));
            if (els.length) return els;
          } catch(e) {}
        }
        return [];
      };

      /** 确定性 hash，用于生成商品 product_id */
      const nameHash = str => {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        return Math.abs(h).toString(16).padStart(8, '0');
      };

      /* ── 订单号（优先 URL 参数，兜底 XPath） ────────────────────── */
      const urlMatch = location.href.match(/(?:biz(?:OrderId|_order_id)|orderId)=([0-9]+)/i);
      const order_id = urlMatch ? urlMatch[1] : getField(CFG.order_id).replace(/[^0-9]/g, '');

      /* ── 支付宝交易号 ────────────────────────────────────────────── */
      const alipay_trade_no = CFG.alipay_trade_no ? getField(CFG.alipay_trade_no) : '';

      /* ── 订单状态 ────────────────────────────────────────────────── */
      let status = getField(CFG.status);
      if (status.includes('成功') || status.includes('完成')) status = '完成';

      /* ── 商品列表 ────────────────────────────────────────────────── */
      let products = [];
      const pc = CFG.products;

      if (pc.strategy === 'rows') {
        // JD 行模式：每行一个商品，字段用相对 XPath 提取
        const rows = getNodes({ xpaths: pc.rowXpaths });
        products = rows.map(row => {
          const name = getField(pc.name, row);
          if (!name) return null;
          const quantity = getField(pc.quantity, row).replace(/[^0-9]/g, '') || '1';
          const price    = getField(pc.price, row).replace(/[^0-9.]/g, '');
          const pid      = pc.product_id ? getField(pc.product_id, row) : nameHash(name);
          return { name, price, quantity, product_id: pid };
        }).filter(Boolean);

      } else {
        // 淘宝列模式：名称/数量/价格各为平行列表，按下标对应
        const nameNodes  = getNodes(pc.name);
        const qtyNodes   = getNodes(pc.quantity);
        const priceNodes = getNodes(pc.price);
        products = nameNodes.map((el, idx) => {
          const name = el.textContent.trim();
          if (!name) return null;
          const quantity = qtyNodes[idx]   ? qtyNodes[idx].textContent.replace(/[^0-9]/g, '')   || '1' : '1';
          const price    = priceNodes[idx] ? priceNodes[idx].textContent.replace(/[^0-9.]/g, '') : '0';
          return { name, price, quantity, product_id: nameHash(name) };
        }).filter(Boolean);
      }

      /* ── 收货信息 ────────────────────────────────────────────────── */
      const sc = CFG.shipping;
      let receiver_name = '', receiver_phone = '', receiver_address = '';

      if (sc.receiver_raw) {
        // 淘宝：单字段逗号分隔（支持全角「，」和半角「,」）
        const raw   = getField(sc.receiver_raw);
        const parts = raw.split(/[,，]/).map(s => s.trim());
        receiver_name    = parts[0] || '';
        receiver_phone   = parts[1] || '';
        receiver_address = parts.slice(2).join('，') || '';
      } else {
        // JD：独立字段
        receiver_name    = sc.receiver_name    ? getField(sc.receiver_name)    : '';
        receiver_phone   = sc.receiver_phone   ? getField(sc.receiver_phone)   : '';
        receiver_address = sc.receiver_address ? getField(sc.receiver_address) : '';
      }

      const express_company = getField(sc.express_company);

      /* ── 价格 ────────────────────────────────────────────────────── */
      const fc = CFG.financial;
      const total_amount  = getField(fc.total).replace(/[^0-9.]/g, '');
      const actual_paid   = getField(fc.actual_paid).replace(/[^0-9.]/g, '') || total_amount;
      const paid_details  = getNodes(fc.paid_details)
        .map(n => n.textContent.replace(/\\s+/g, ' ').trim())
        .filter(Boolean);

      /* ── 时间 ────────────────────────────────────────────────────── */
      const tc = CFG.timeline;
      const order_time = getField(tc.order_time);
      const pay_time   = getField(tc.pay_time) || order_time;

      return {
        order_id, alipay_trade_no, status, products,
        shipping: { receiver_name, receiver_phone, receiver_address, express_company },
        financial: { total: total_amount, paid: actual_paid, details: paid_details },
        timeline: { order_time, pay_time },
        raw_html: document.body.innerHTML
      };

    } catch(e) {
      return { error: e.message };
    }
  })();
  `;
}
