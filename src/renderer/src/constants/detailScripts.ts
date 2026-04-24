import { buildDetailScript } from "../config/scriptBuilder";
import { JD_DETAIL_CONFIG, TAOBAO_DETAIL_CONFIG } from "../config/extractors";

export const EXTRACT_JD_DETAIL_SCRIPT = buildDetailScript(JD_DETAIL_CONFIG);
export const EXTRACT_TAOBAO_DETAIL_SCRIPT = buildDetailScript(TAOBAO_DETAIL_CONFIG);

/**
 * 飞猪旅行订单详情提取脚本
 * 适用于 orderdetail.fliggy.com/tripOrderDetail.htm?orderId=XXX
 * 飞猪页面是 React SPA，class 含 hash，无法用固定 XPath，改用文本模式匹配
 */
export const EXTRACT_FLIGGY_DETAIL_SCRIPT = `
(() => {
  try {
    // 1. 从 URL 取订单号（支持 orderId= 和 bizOrderId=）
    const urlMatch = location.href.match(/(?:biz(?:OrderId|_order_id)|orderId)=([0-9]+)/i);
    const order_id = urlMatch ? urlMatch[1] : '';
    if (!order_id) return { error: 'no order_id in URL: ' + location.href };

    const bodyText = document.body ? document.body.innerText : '';

    // 2. 订单状态 — 匹配常见飞猪状态文案
    const statusKeywords = ['交易成功', '已完成', '交易关闭', '已取消', '待出行', '出行中', '待确认', '已确认', '退款成功', '退款中', '已退款'];
    let status = '';
    for (const kw of statusKeywords) {
      if (bodyText.includes(kw)) { status = kw; break; }
    }

    // 3. 行程/产品名称
    //    优先找 <h1>/<h2>，其次找含 "title"/"name"/"product" 类名的第一个非空元素
    let tripName = '';
    const headingEl = document.querySelector('h1, h2');
    if (headingEl && headingEl.textContent.trim().length > 2) {
      tripName = headingEl.textContent.trim();
    } else {
      const candidates = Array.from(document.querySelectorAll('[class*="title"],[class*="name"],[class*="product"],[class*="item"]'));
      for (const el of candidates) {
        const t = el.textContent.trim();
        if (t.length > 4 && t.length < 80 && !t.includes('\\n')) { tripName = t; break; }
      }
    }
    if (!tripName) tripName = document.title || '飞猪旅行订单';

    // 4. 金额 — 依次尝试「实付」「应付」「订单金额」「总价」
    const amountPatterns = [
      /实付[款金额]*[：:￥\\s]*([\\d,]+\\.?\\d*)/,
      /应付[款金额]*[：:￥\\s]*([\\d,]+\\.?\\d*)/,
      /订单[总金额]*[：:￥\\s]*([\\d,]+\\.?\\d*)/,
      /总价[：:￥\\s]*([\\d,]+\\.?\\d*)/,
      /¥\\s*([\\d,]+\\.?\\d*)/
    ];
    let actual_paid = '';
    for (const pat of amountPatterns) {
      const m = bodyText.match(pat);
      if (m) { actual_paid = m[1].replace(/,/g, ''); break; }
    }

    // 5. 时间
    const timeMatch = bodyText.match(/(\\d{4})[年-](\\d{1,2})[月-](\\d{1,2})[日\\s]\\s*(\\d{2}:\\d{2})/);
    const order_time = timeMatch
      ? \`\${timeMatch[1]}-\${timeMatch[2].padStart(2,'0')}-\${timeMatch[3].padStart(2,'0')} \${timeMatch[4]}\`
      : '';

    // 6. 联系人/出行人（取第一个手机号附近的姓名）
    let receiver_name = '', receiver_phone = '';
    const phoneMatch = bodyText.match(/1[3-9]\\d{9}/);
    if (phoneMatch) {
      receiver_phone = phoneMatch[0];
      // 电话前后 20 字符内取汉字名
      const idx = bodyText.indexOf(phoneMatch[0]);
      const nearby = bodyText.substring(Math.max(0, idx - 20), idx);
      const nameMatch = nearby.match(/[\\u4e00-\\u9fa5]{2,4}$/);
      if (nameMatch) receiver_name = nameMatch[0];
    }

    return {
      order_id,
      alipay_trade_no: '',
      status: status || '未知',
      products: [{
        name: tripName,
        price: actual_paid || '0',
        quantity: '1',
        product_id: order_id
      }],
      shipping: {
        receiver_name,
        receiver_phone,
        receiver_address: '',
        express_company: ''
      },
      financial: {
        total: actual_paid || '0',
        paid: actual_paid || '0',
        details: []
      },
      timeline: { order_time, pay_time: order_time },
      raw_html: document.body.innerHTML
    };
  } catch(e) {
    return { error: e.message };
  }
})();
`;
