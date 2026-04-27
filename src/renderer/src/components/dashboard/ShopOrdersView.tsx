import React, { useEffect, useState } from "react";
import { primaryBtn, secondaryBtn } from "../../styles";

export type TimeRange = string;

function buildTimeRangeOptions(): { value: TimeRange; label: string }[] {
  const currentYear = new Date().getFullYear();
  const opts: { value: TimeRange; label: string }[] = [
    { value: "last_month", label: "最近1个月" },
    { value: "this_year",  label: "今年" },
  ];
  // 从今年开始往前 5 年，避免今年重复
  for (let y = currentYear; y >= currentYear - 5; y--) {
    opts.push({ value: String(y), label: `${y}年` });
  }
  return opts;
}

const TIME_RANGE_OPTIONS = buildTimeRangeOptions();

interface ShopOrdersViewProps {
  platform: "taobao" | "jd";
  isCapturing: boolean;
  progressMsg: string;
  users: any[];
  onCaptureAll: (timeRange: TimeRange) => void;
  onGoSettings: () => void;
}

const PLATFORM_CONFIG = {
  taobao: {
    label: "淘宝订单",
    color: "#f97316",
    bg: "#f9731622",
    badge: "TAOBAO",
  },
  jd: {
    label: "京东订单",
    color: "#ef4444",
    bg: "#ef444422",
    badge: "JD",
  },
};

/** 按时间范围过滤订单（前端显示用） */
function filterOrdersByRange(orders: any[], range: TimeRange): any[] {
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (range === "last_month") {
    start = new Date(now);
    start.setMonth(start.getMonth() - 1);
  } else if (range === "this_year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    const year = parseInt(range, 10);
    if (!isNaN(year)) {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    }
  }

  return orders.filter((o) => {
    if (!o.time) return true;
    const d = new Date(o.time);
    if (isNaN(d.getTime())) return true;
    if (start && d < start) return false;
    if (end && d >= end) return false;
    return true;
  });
}

export function ShopOrdersView({
  platform,
  isCapturing,
  progressMsg,
  users,
  onCaptureAll,
  onGoSettings,
}: ShopOrdersViewProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRange, setSelectedRange] = useState<TimeRange>(
    String(new Date().getFullYear())
  );
  const cfg = PLATFORM_CONFIG[platform];

  const loadOrders = async () => {
    setLoading(true);
    try {
      let data: any[];
      // @ts-ignore
      if (typeof window.api.getOrdersByPlatform === "function") {
        // @ts-ignore
        data = await window.api.getOrdersByPlatform(platform);
      } else {
        // 兜底：拉全量再在前端过滤
        // @ts-ignore
        const all = await window.api.getOrders();
        data = (all || []).filter((o: any) => o.platform === platform);
      }
      setOrders(data || []);
    } catch (e: any) {
      console.error("[ShopOrdersView] loadOrders error:", e);
      setErrorMsg(e?.message || "加载失败");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  // 采集完毕后刷新
  useEffect(() => {
    if (!isCapturing) loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapturing]);

  const displayOrders = filterOrdersByRange(orders, selectedRange);
  const totalAmount = displayOrders.reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div style={{ padding: 30 }}>
      {/* 顶部栏 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>{cfg.label}</h3>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            共 {displayOrders.length} 笔 · 合计{" "}
            <span style={{ color: "#f472b6", fontWeight: 600 }}>
              ¥{totalAmount.toFixed(2)}
            </span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {progressMsg && (
            <span style={{ fontSize: 12, color: "#34d399", maxWidth: 260 }}>
              {progressMsg}
            </span>
          )}

          {/* 时间范围选择器 */}
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value as TimeRange)}
            disabled={isCapturing}
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 13,
              cursor: isCapturing ? "not-allowed" : "pointer",
              outline: "none",
            }}
          >
            {TIME_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {users.length > 0 ? (
            <button
              onClick={() => onCaptureAll(selectedRange)}
              disabled={isCapturing}
              style={{
                ...primaryBtn,
                background: isCapturing
                  ? "#64748b"
                  : "linear-gradient(135deg, #38bdf8, #818cf8)",
              }}
            >
              {isCapturing ? "采集中..." : "拉取数据"}
            </button>
          ) : (
            <button onClick={onGoSettings} style={secondaryBtn}>
              去设置页授权账号
            </button>
          )}
          <button onClick={loadOrders} style={secondaryBtn} title="刷新">
            ↻ 刷新
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #334155",
        }}
      >
        <table
          style={{
            width: "100%",
            textAlign: "left",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "#0f172a", color: "#64748b", fontSize: 12 }}>
              <th style={{ padding: "12px 16px" }}>店铺</th>
              <th style={{ padding: "12px 16px" }}>订单号</th>
              <th style={{ padding: "12px 16px" }}>商品信息</th>
              <th style={{ padding: "12px 16px" }}>状态</th>
              <th style={{ padding: "12px 16px" }}>金额</th>
              <th style={{ padding: "12px 16px" }}>交易时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                  加载中...
                </td>
              </tr>
            ) : displayOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                  {errorMsg
                    ? `加载出错：${errorMsg}`
                    : orders.length > 0
                    ? `所选时间范围（${TIME_RANGE_OPTIONS.find((o) => o.value === selectedRange)?.label}）内暂无数据`
                    : "暂无数据，请先授权账号并拉取数据"}
                </td>
              </tr>
            ) : (
              displayOrders.map((o) => {
                const isSuccess =
                  o.status === "完成" ||
                  o.status === "交易成功" ||
                  o.status?.includes("成功");
                return (
                  <tr
                    key={o.id}
                    style={{ borderBottom: "1px solid #1e293b" }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94a3b8",
                        maxWidth: 140,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {o.shop_name || "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: cfg.color, fontFamily: "monospace", fontSize: 12 }}>
                        {o.order_id}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: 240,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "#e2e8f0",
                      }}
                    >
                      {o.title}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          background: isSuccess ? "#10b98133" : "#64748b33",
                          color: isSuccess ? "#10b981" : "#94a3b8",
                        }}
                      >
                        {o.status || "-"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#f472b6",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ¥{(o.amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                      {o.time}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
