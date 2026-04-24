// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

/** 单字段提取配置：依次尝试 xpaths，再依次尝试 selectors，取第一个非空结果 */
export interface FieldConfig {
  xpaths?: string[];
  selectors?: string[];
}

/** 商品提取策略 — 行模式（JD）：每一行是一个商品 */
export interface ProductRowConfig {
  strategy: "rows";
  /** 找商品行的 XPath，依次尝试 */
  rowXpaths: string[];
  name: FieldConfig;      // 相对于行的 XPath/选择器
  quantity: FieldConfig;
  price: FieldConfig;
  product_id?: FieldConfig; // 若未配置则用名称 hash
}

/** 商品提取策略 — 列模式（淘宝）：名称/数量/价格各自是平行列表，按下标对应 */
export interface ProductColumnConfig {
  strategy: "columns";
  name: FieldConfig;
  quantity: FieldConfig;
  price: FieldConfig;
}

export interface ShippingConfig {
  /** 若配置了 receiver_raw，按逗号分隔拆成 name/phone/address */
  receiver_raw?: FieldConfig;
  /** 直接配置独立字段（JD 样式） */
  receiver_name?: FieldConfig;
  receiver_phone?: FieldConfig;
  receiver_address?: FieldConfig;
  express_company: FieldConfig;
}

export interface DetailExtractConfig {
  platform: string;
  order_id: FieldConfig;
  alipay_trade_no?: FieldConfig;
  status: FieldConfig;
  products: ProductRowConfig | ProductColumnConfig;
  shipping: ShippingConfig;
  financial: {
    total: FieldConfig;
    actual_paid: FieldConfig;
    /** 多节点：每个节点的 textContent 组成数组 */
    paid_details: FieldConfig;
  };
  timeline: {
    order_time: FieldConfig;
    pay_time: FieldConfig;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 京东详情配置
// ─────────────────────────────────────────────────────────────────────────────
export const JD_DETAIL_CONFIG: DetailExtractConfig = {
  platform: "jd",

  order_id: {
    xpaths: ["//input[@id='orderid']/@value"],
    selectors: ["#orderid"],
  },

  status: {
    xpaths: [
      "//h3[contains(@class,'state-txt')]/text()",
      "//*[contains(@class,'state-txt')]/text()",
    ],
    selectors: [".state-txt", "[class*='state-txt']"],
  },

  products: {
    strategy: "rows",
    rowXpaths: ["//tr[contains(@class,'product-')]"],
    name: {
      xpaths: [
        ".//td[2]//div[@class='p-name']//a",
        ".//td[2]//*[contains(@class,'p-name')]",
      ],
    },
    quantity: {
      xpaths: [
        ".//td[contains(@class,'p-num')]",
        ".//td[5]",
      ],
    },
    price: {
      xpaths: [
        ".//td[4]//span[@class='f-price']",
        ".//td[4]//span",
        ".//td[4]",
      ],
    },
  },

  shipping: {
    receiver_name: {
      xpaths: ["//div[@class='dl'][1]/div[@class='dd']/div[@class='item'][1]/div[@class='info-rcol']"],
    },
    receiver_phone: {
      xpaths: ["//div[@class='dl'][1]/div[@class='dd']/div[@class='item'][3]/div[@class='info-rcol']"],
    },
    receiver_address: {
      xpaths: ["//div[@class='dl'][1]/div[@class='dd']/div[@class='item'][2]/div[@class='info-rcol']"],
    },
    express_company: {
      xpaths: ["//div[@class='dl'][2]/div[@class='dd']/div[@class='item'][1]/div[@class='info-rcol']"],
    },
  },

  financial: {
    total: {
      xpaths: ["//div[@class='goods-total']//ul/li[1]/span[2]/text()"],
    },
    actual_paid: {
      xpaths: ["//div[@class='goods-total']//ul/li[last()]/span[2]/text()"],
    },
    paid_details: {
      xpaths: ["//div[@class='goods-total']//ul/li"],
    },
  },

  timeline: {
    order_time: {
      xpaths: ["//li[@id='track_time_0']"],
    },
    pay_time: {
      xpaths: ["//div[@id='pay-info-nozero']/div[@class='dd']/div[@class='item'][2]/div[@class='info-rcol']"],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 淘宝 / 天猫详情配置
// ─────────────────────────────────────────────────────────────────────────────
export const TAOBAO_DETAIL_CONFIG: DetailExtractConfig = {
  platform: "taobao",

  order_id: {
    // URL 参数优先，XPath 作为兜底
    xpaths: [
      "//div[contains(@class,'detailInfoContent--')][.//div[contains(@class,'detailInfoTitle--') and contains(text(),'订单编号')]]//a[contains(@class,'detailInfoItemRightPrint')]",
    ],
    selectors: ["[class*='orderInfo'] [class*='orderNum']"],
  },

  alipay_trade_no: {
    xpaths: [
      "//div[contains(@class,'detailInfoContent--')][.//div[contains(@class,'detailInfoTitle--') and contains(text(),'支付宝交易号')]]//a[contains(@class,'detailInfoItemRightPrint')]",
      "//div[@data-spm='otherInfo']//div[contains(@class,'c-text text-item ') and contains(text(),'支付宝交易号')]/span[@class='desc']",
      "//span[@class='alilay-num']",
      "//span[contains(@class,'misc-info-mod__nv')][.//span[contains(@class, 'misc-info-mod__label') and contains(text(),'支付宝交易号')]]/span[contains(@class,'misc-info-mod__content')]"
    ],
  },

  status: {
    xpaths: [
      "//div[@id='headerContainer']//span[contains(@class,'content--')]",
      "//*[contains(@class,'statusTitle--')]",
      "//*[contains(@class,'tradeStatus--')]",
      "//*[contains(@class,'order-status')]",
      "//div[@class='trade-status']//span",
      "//div[contains(@class,'status-desc-mod__status-desc')]/div[1]"
    ],
    selectors: [
      "[class*='statusTitle']",
      "[class*='tradeStatus']",
      "[class*='order-status']",
    ],
  },

  products: {
    strategy: "columns",
    name: {
      xpaths: [
        "//a[contains(@class,'title--')]", 
        "//tr[@class='order-item']/td[@class='item']//span[@class='name']",
        "//div[contains(@class,'tem-mod__text-info')]//div[@class='name']"
      ],
      selectors: ["[class*='title--'][href]"],
    },
    quantity: {
      xpaths: [
        "//div[contains(@class,'quantity--')]", 
        "//tr[@class='order-item']/td[@class='num']",
        "//tr[@class='order-item']/td[6]"
      ],
      selectors: ["[class*='quantity--']"],
    },
    price: {
      xpaths: [
        "//div[contains(@class,'baseInfoRight--')]//div[contains(@class,'trade-price-container-block')]",
        "//tr[@class='order-item']/td[@class='price']",
        "//tr[@class='order-item']/td[5]"
      ],
      selectors: [
        "[class*='baseInfoRight--'] [class*='trade-price-container-block']",
      ],
    },
  },

  shipping: {
    // 淘宝收货信息是「姓名，电话，地址」逗号合并的一个字段
    receiver_raw: {
      xpaths: [
        "//div[contains(@class,'detailInfoContent--')][.//div[contains(@class,'detailInfoTitle--') and contains(text(),'收货信息')]]//a[contains(@class,'detailInfoItemRightPrint')]",
      ],
    },
    express_company: {
      xpaths: ["//div[contains(@class,'logisticsPackageEXTxt--')]"],
      selectors: ["[class*='logisticsPackageEXTxt--']"],
    },
  },

  financial: {
    total: {
      xpaths: [
        "//div[contains(@class,'detailInfoItemLeftPrint--') and contains(text(),'商品总价')]/following-sibling::div[contains(@class,'trade-price-container')]",
        "//tr[@class='order-item']/td[@class='order-price']",
        "//ul[contains(@class,'pay-info-mod__fee')]/li[1]/span[2]"
      ],
    },
    actual_paid: {
      xpaths: [
        "//div[contains(@class,'detailInfoItemLeftPrint--') and contains(text(),'实付款')]/following-sibling::div[contains(@class,'trade-price-container')]",
        "//div[@class='get-money']//strong",
        "//div[contains(@class,'pay-info-mod__fee')]//div[contains(@class,'pay-info-mod__left')]//span[contains(@class,'pay-info-mod__value')]//strong"
      ],
    },
    paid_details: {
      xpaths: [
        "//div[contains(@class,'trade-order-detail-settlement-info')]//div[contains(@class,'detailInfoContent--')]",
      ],
    },
  },

  timeline: {
    order_time: {
      xpaths: [
        "//div[contains(@class,'detailInfoContent--')][.//div[contains(@class,'detailInfoTitle--') and contains(text(),'创建时间')]]//a[contains(@class,'detailInfoItemRightPrint')]",
        "//span[@class='trade-time']",
        "//span[contains(@class,'misc-info-mod__nv')][.//span[contains(@class, 'misc-info-mod__label') and contains(text(),'创建时间')]]/span[contains(@class,'misc-info-mod__content')]"
      ],
    },
    pay_time: {
      xpaths: [
        "//div[contains(@class,'detailInfoContent--')][.//div[contains(@class,'detailInfoTitle--') and contains(text(),'付款时间')]]//a[contains(@class,'detailInfoItemRightPrint')]",
        "//span[@class='pay-time']",
        "//span[contains(@class,'misc-info-mod__nv')][.//span[contains(@class, 'misc-info-mod__label') and contains(text(),'付款时间')]]/span[contains(@class,'misc-info-mod__content')]"
      ],
    },
  },
};
