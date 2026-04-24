import React, { useEffect, useState } from "react";
import { primaryBtn, secondaryBtn } from "../../styles";

export function WechatBillsView() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const loadBills = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const data = await window.api.getWechatBills();
      setBills(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleImport = async () => {
    setImporting(true);
    try {
      // @ts-ignore
      const result = await window.api.importWechatExcel();
      if (result.canceled) return;
      if (result.error) {
        alert("导入失败：" + result.error);
        return;
      }
      alert(`导入成功，共导入 ${result.count} 条账单`);
      await loadBills();
    } catch (e: any) {
      alert("导入出错：" + e.message);
    } finally {
      setImporting(false);
    }
  };

  const totalIn = bills
    .filter((b) => b.type === "收入")
    .reduce((s, b) => s + (b.amount || 0), 0);
  const totalOut = bills
    .filter((b) => b.type === "支出")
    .reduce((s, b) => s + (b.amount || 0), 0);

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
        <div>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>微信账单</h3>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            共 {bills.length} 笔 · 收入{" "}
            <span style={{ color: "#34d399", fontWeight: 600 }}>¥{totalIn.toFixed(2)}</span>
            {" "}· 支出{" "}
            <span style={{ color: "#f472b6", fontWeight: 600 }}>¥{totalOut.toFixed(2)}</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              ...primaryBtn,
              background: importing
                ? "#64748b"
                : "linear-gradient(135deg, #07c160, #059742)",
            }}
          >
            {importing ? "导入中..." : "📂 导入 Excel 文件"}
          </button>
          <button onClick={loadBills} style={secondaryBtn}>
            ↻ 刷新
          </button>
        </div>
      </div>

      {bills.length === 0 && !loading && (
        <div
          style={{
            background: "#1e293b",
            border: "1px dashed #334155",
            borderRadius: 10,
            padding: 30,
            textAlign: "center",
            color: "#64748b",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>💚</div>
          <p style={{ margin: "0 0 8px" }}>暂无微信账单数据</p>
          <p style={{ margin: 0, fontSize: 12 }}>
            请在微信 → 我 → 支付 → 账单 → 导出账单 下载 .xlsx 文件后导入
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#475569" }}>
            注意：若文件有解压密码，请先用密码解压后再导入
          </p>
        </div>
      )}

      {(loading || bills.length > 0) && (
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
                <th style={{ padding: "12px 16px" }}>交易时间</th>
                <th style={{ padding: "12px 16px" }}>交易类型</th>
                <th style={{ padding: "12px 16px" }}>交易对方</th>
                <th style={{ padding: "12px 16px" }}>商品</th>
                <th style={{ padding: "12px 16px" }}>收/支</th>
                <th style={{ padding: "12px 16px" }}>金额</th>
                <th style={{ padding: "12px 16px" }}>支付方式</th>
                <th style={{ padding: "12px 16px" }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    加载中...
                  </td>
                </tr>
              ) : (
                bills.map((b) => {
                  const isIn = b.type === "收入";
                  const isNotInOut = b.type !== "收入" && b.type !== "支出";
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "11px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                        {b.trade_time}
                      </td>
                      <td style={{ padding: "11px 16px", color: "#94a3b8" }}>
                        {b.trade_type || "-"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          maxWidth: 140,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#e2e8f0",
                        }}
                      >
                        {b.counterparty || "-"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          maxWidth: 200,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#cbd5e1",
                        }}
                      >
                        {b.product || "-"}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            background: isNotInOut
                              ? "#64748b22"
                              : isIn
                              ? "#34d39922"
                              : "#f472b622",
                            color: isNotInOut ? "#94a3b8" : isIn ? "#34d399" : "#f472b6",
                            fontWeight: 600,
                          }}
                        >
                          {b.type || "-"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontWeight: 600,
                          color: isNotInOut ? "#94a3b8" : isIn ? "#34d399" : "#f472b6",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isIn ? "+" : isNotInOut ? "" : "-"}¥{(b.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "11px 16px", color: "#64748b", fontSize: 12 }}>
                        {b.payment_method || "-"}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            background: (b.status || "").includes("成功")
                              ? "#10b98122"
                              : "#64748b22",
                            color: (b.status || "").includes("成功") ? "#10b981" : "#94a3b8",
                          }}
                        >
                          {b.status || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
