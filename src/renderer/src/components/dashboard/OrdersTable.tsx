import React from "react";
import { primaryBtn, secondaryBtn } from "../../styles";

interface OrdersTableProps {
  orders: any[];
  accounts: any[];
  activeUser: any;
  isCapturing: boolean;
  users: any[];
  onCaptureAll: () => void;
  onGoSettings: () => void;
}

export function OrdersTable({
  orders,
  accounts,
  activeUser,
  isCapturing,
  users,
  onCaptureAll,
  onGoSettings,
}: OrdersTableProps) {
  return (
    <div style={{ padding: 30 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0, fontWeight: 500 }}>账单流水总览</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            近3个月
          </div>
          {users.length > 0 ? (
            <button
              onClick={onCaptureAll}
              disabled={isCapturing}
              style={{
                ...primaryBtn,
                background: isCapturing
                  ? "#64748b"
                  : "linear-gradient(135deg, #38bdf8, #818cf8)",
              }}
            >
              {isCapturing ? "采集中..." : "获取所有账户最近3个月数据"}
            </button>
          ) : (
            <button onClick={onGoSettings} style={secondaryBtn}>
              去设置页授权账号
            </button>
          )}
        </div>
      </div>

      <table
        style={{
          width: "100%",
          textAlign: "left",
          borderCollapse: "collapse",
          fontSize: "14px",
          background: "#1e293b",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #334155", color: "#94a3b8" }}>
            <th style={{ padding: "15px" }}>平台</th>
            <th style={{ padding: "15px" }}>归属</th>
            <th style={{ padding: "15px" }}>店铺名称</th>
            <th style={{ padding: "15px" }}>订单号</th>
            <th style={{ padding: "15px" }}>商品信息</th>
            <th style={{ padding: "15px" }}>状态</th>
            <th style={{ padding: "15px" }}>金额</th>
            <th style={{ padding: "15px" }}>交易时间</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const acc = accounts.find((a) => a.id === o.account_id);
            const isSuccess =
              o.status === "交易成功" ||
              o.status === "完成" ||
              o.status?.includes("成功");
            return (
              <tr key={o.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "15px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: o.platform === "jd" ? "#ef444433" : "#f9731633",
                      color: o.platform === "jd" ? "#ef4444" : "#f97316",
                      fontSize: 12,
                    }}
                  >
                    {o.platform.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "15px", color: "#cbd5e1" }}>
                  {acc
                    ? `${activeUser?.name} (${acc.nickname || acc.account_name})`
                    : "未知"}
                </td>
                <td
                  style={{
                    padding: "15px",
                    color: "#94a3b8",
                    maxWidth: 150,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {o.shop_name || "-"}
                </td>
                <td style={{ padding: "15px", color: "#38bdf8" }}>{o.order_id}</td>
                <td
                  style={{
                    padding: "15px",
                    maxWidth: 200,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {o.title}
                </td>
                <td style={{ padding: "15px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      background: isSuccess ? "#10b98133" : "#64748b33",
                      color: isSuccess ? "#10b981" : "#94a3b8",
                    }}
                  >
                    {o.status || "-"}
                  </span>
                </td>
                <td
                  style={{ padding: "15px", color: "#f472b6", fontWeight: "bold" }}
                >
                  ￥{o.amount.toFixed(2)}
                </td>
                <td style={{ padding: "15px", color: "#94a3b8" }}>{o.time}</td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{ padding: 40, textAlign: "center", color: "#64748b" }}
              >
                暂无订单数据，请先添加账户并抓取。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
