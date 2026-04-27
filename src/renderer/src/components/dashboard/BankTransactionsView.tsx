import React, { useEffect, useState, useCallback } from "react";
import { C } from "../../styles";
import { BankImportWizard } from "./BankImportWizard";

interface BankTransactionsViewProps {
  profileId: string;
  profileName: string;
}

export function BankTransactionsView({ profileId, profileName }: BankTransactionsViewProps) {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadTxns = useCallback(async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const data = await window.api.getBankTransactions(profileId);
      setTxns(data || []);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadTxns();
  }, [loadTxns]);

  const totalIn = txns
    .filter((t) => t.type === "收入")
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = txns
    .filter((t) => t.type === "支出")
    .reduce((s, t) => s + (t.amount || 0), 0);
  const latestBalance = txns.length > 0 ? txns[0].balance : null;

  return (
    <div style={{ padding: 30 }}>
      {/* 导入向导弹窗 */}
      {wizardOpen && (
        <BankImportWizard
          profileId={profileId}
          profileName={profileName}
          onClose={() => setWizardOpen(false)}
          onImported={() => {
            setWizardOpen(false);
            loadTxns();
          }}
        />
      )}

      {/* 页头 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18, color: C.text1 }}>
            {profileName} 流水
          </h3>
          <span style={{ fontSize: 13, color: C.text3 }}>
            共 {txns.length} 笔 · 收入{" "}
            <span style={{ color: "#34d399", fontWeight: 600 }}>¥{totalIn.toFixed(2)}</span>
            {" "}· 支出{" "}
            <span style={{ color: "#f472b6", fontWeight: 600 }}>¥{totalOut.toFixed(2)}</span>
            {latestBalance !== null && latestBalance !== 0 && (
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
            onClick={() => setWizardOpen(true)}
            style={{
              padding: "9px 18px",
              background: "linear-gradient(135deg, #d4a017, #a07010)",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📂 导入流水
          </button>
          <button
            onClick={loadTxns}
            style={{
              padding: "9px 16px",
              background: "transparent",
              border: `1px solid ${C.borderMd}`,
              borderRadius: 8,
              color: C.text2,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ↻ 刷新
          </button>
        </div>
      </div>

      {/* 空状态 */}
      {txns.length === 0 && !loading && (
        <div
          style={{
            background: C.bgSurface,
            border: `1px dashed ${C.borderMd}`,
            borderRadius: 10,
            padding: 40,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: C.text2 }}>
            暂无 {profileName} 流水数据
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 12, color: C.text3 }}>
            点击"导入流水"，选择银行导出的文件（PDF / CSV / Excel），
            <br />
            AI 会自动分析格式并生成解析脚本
          </p>
          <button
            onClick={() => setWizardOpen(true)}
            style={{
              padding: "10px 24px",
              background: `linear-gradient(135deg, ${C.accent}, ${C.violet})`,
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📂 导入流水
          </button>
        </div>
      )}

      {/* 数据表格 */}
      {(loading || txns.length > 0) && (
        <div
          style={{
            background: C.bgSurface,
            borderRadius: 10,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
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
              <tr
                style={{
                  background: "#0f172a",
                  color: C.text3,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <th style={{ padding: "11px 16px" }}>记账日期</th>
                <th style={{ padding: "11px 16px" }}>收/支</th>
                <th style={{ padding: "11px 16px" }}>金额</th>
                <th style={{ padding: "11px 16px" }}>余额</th>
                <th style={{ padding: "11px 16px" }}>摘要</th>
                <th style={{ padding: "11px 16px" }}>对手方</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.text3 }}>
                    加载中...
                  </td>
                </tr>
              ) : (
                txns.map((t) => {
                  const isIn = t.type === "收入";
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td style={{ padding: "11px 16px", color: C.text3, whiteSpace: "nowrap" }}>
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
                      <td
                        style={{ padding: "11px 16px", color: "#fbbf24", whiteSpace: "nowrap" }}
                      >
                        {t.balance ? `¥${(t.balance || 0).toFixed(2)}` : "-"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          color: C.text2,
                          maxWidth: 280,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.description || "-"}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          color: C.text3,
                          maxWidth: 160,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: 12,
                        }}
                      >
                        {t.counterparty || "-"}
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
