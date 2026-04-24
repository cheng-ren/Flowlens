import React, { useEffect, useState } from "react";
import { primaryBtn, secondaryBtn } from "../../styles";

export function BankTransactionsView() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const loadTxns = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const data = await window.api.getBankTransactions();
      setTxns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTxns();
  }, []);

  const handleImport = async () => {
    setImporting(true);
    try {
      // @ts-ignore
      const result = await window.api.importBankPdf();
      if (result.canceled) return;
      if (result.error) {
        alert("导入失败：" + result.error);
        return;
      }
      alert(`导入成功，共导入 ${result.count} 条流水`);
      await loadTxns();
    } catch (e: any) {
      alert("导入出错：" + e.message);
    } finally {
      setImporting(false);
    }
  };

  const totalIn = txns
    .filter((t) => t.type === "收入")
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = txns
    .filter((t) => t.type === "支出")
    .reduce((s, t) => s + (t.amount || 0), 0);
  const latestBalance = txns.length > 0 ? txns[0].balance : null;

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
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>招商银行流水</h3>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            共 {txns.length} 笔 · 收入{" "}
            <span style={{ color: "#34d399", fontWeight: 600 }}>¥{totalIn.toFixed(2)}</span>
            {" "}· 支出{" "}
            <span style={{ color: "#f472b6", fontWeight: 600 }}>¥{totalOut.toFixed(2)}</span>
            {latestBalance !== null && (
              <>
                {" "}· 最新余额{" "}
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                  ¥{latestBalance.toFixed(2)}
                </span>
              </>
            )}
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
                : "linear-gradient(135deg, #d4a017, #a07010)",
            }}
          >
            {importing ? "导入中..." : "📄 导入 PDF 文件"}
          </button>
          <button onClick={loadTxns} style={secondaryBtn}>
            ↻ 刷新
          </button>
        </div>
      </div>

      {txns.length === 0 && !loading && (
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
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏦</div>
          <p style={{ margin: "0 0 8px" }}>暂无银行流水数据</p>
          <p style={{ margin: 0, fontSize: 12 }}>
            请在招商银行 App → 账户 → 账单查询 → 申请明细 下载 PDF 后导入
          </p>
        </div>
      )}

      {(loading || txns.length > 0) && (
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
                <th style={{ padding: "12px 16px" }}>记账日期</th>
                <th style={{ padding: "12px 16px" }}>收/支</th>
                <th style={{ padding: "12px 16px" }}>金额</th>
                <th style={{ padding: "12px 16px" }}>余额</th>
                <th style={{ padding: "12px 16px" }}>摘要/附言</th>
                <th style={{ padding: "12px 16px" }}>银行</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    加载中...
                  </td>
                </tr>
              ) : (
                txns.map((t) => {
                  const isIn = t.type === "收入";
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "11px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {t.trade_date}
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
                          {t.type}
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
                        {isIn ? "+" : "-"}¥{(t.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "11px 16px", color: "#fbbf24", whiteSpace: "nowrap" }}>
                        ¥{(t.balance || 0).toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#94a3b8",
                          maxWidth: 300,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.description || "-"}
                      </td>
                      <td style={{ padding: "11px 16px", color: "#64748b", fontSize: 12 }}>
                        {t.bank}
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
