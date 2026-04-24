import React, { useEffect, useState } from "react";
import { primaryBtn, secondaryBtn } from "../../styles";

/** 将 "4/16/26 10:43" 之类的美式日期统一为 "2026-04-16 10:43" */
function normalizeDate(raw: string): string {
  if (!raw) return "-";
  // 已经是 YYYY-MM-DD 格式直接返回
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  // M/D/YY HH:MM 格式
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(.*)/);
  if (m) {
    const year = m[3].length === 2 ? "20" + m[3] : m[3];
    const month = m[1].padStart(2, "0");
    const day = m[2].padStart(2, "0");
    return `${year}-${month}-${day} ${m[4]}`.trim();
  }
  return raw;
}

export function AlipayBillsView() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const loadBills = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const data = await window.api.getAlipayBills();
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
      const result = await window.api.importAlipayExcel();
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
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>支付宝账单</h3>
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
                : "linear-gradient(135deg, #1677ff, #0050d7)",
            }}
          >
            {importing ? "导入中..." : "📂 导入 Excel 文件"}
          </button>
          <button onClick={loadBills} style={secondaryBtn}>
            ↻ 刷新
          </button>
        </div>
      </div>

      {/* 导入提示 */}
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
          <div style={{ fontSize: 36, marginBottom: 10 }}>💙</div>
          <p style={{ margin: "0 0 8px" }}>暂无支付宝账单数据</p>
          <p style={{ margin: 0, fontSize: 12 }}>
            请在支付宝 App → 账单 → 导出 下载 .xls 文件后导入
          </p>
        </div>
      )}

      {/* 表格 */}
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
                <th style={{ padding: "12px 16px" }}>分类</th>
                <th style={{ padding: "12px 16px" }}>交易对方</th>
                <th style={{ padding: "12px 16px" }}>商品名称</th>
                <th style={{ padding: "12px 16px" }}>收/支</th>
                <th style={{ padding: "12px 16px" }}>金额</th>
                <th style={{ padding: "12px 16px" }}>付款方式</th>
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
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "11px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                        {normalizeDate(b.trade_time)}
                      </td>
                      <td style={{ padding: "11px 16px", color: "#94a3b8" }}>
                        {b.category || "-"}
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
                            background: isIn ? "#34d39922" : "#f472b622",
                            color: isIn ? "#34d399" : "#f472b6",
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
                          color: isIn ? "#34d399" : "#f472b6",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isIn ? "+" : "-"}¥{(b.amount || 0).toFixed(2)}
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
