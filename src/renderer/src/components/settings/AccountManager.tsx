import React, { useState, useEffect } from "react";
import { card, secondaryBtn, C } from "../../styles";

export interface BankProfile {
  id: string;
  name: string;
  user_id: string;
  file_type: string | null;
  import_script: string | null;
  script_description: string | null;
  created_at: string;
}

interface AccountManagerProps {
  activeUser: any;
  accounts: any[];
  onAddAccount: (platform: string) => void;
  onAuthorize: (account: any) => void;
  onDeleteAccount: (account: any) => void;
  onBankProfilesChanged?: () => void;
}

// ── 平台图标 ─────────────────────────────────────────────────────────────────

function JdLogo() {
  return (
    <div
      title="京东"
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: "#e2231a",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 48 48" width="26" height="26" fill="white" xmlns="http://www.w3.org/2000/svg">
        <text x="2" y="36" fontSize="34" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" fill="white">JD</text>
      </svg>
    </div>
  );
}

function TaobaoLogo() {
  return (
    <div
      title="淘宝"
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: "linear-gradient(135deg, #ff6900, #ff4400)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 48 48" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="19" rx="14" ry="11" fill="white" opacity="0.95" />
        <ellipse cx="24" cy="19" rx="10" ry="7.5" fill="none" stroke="#ff6900" strokeWidth="2.5" />
        <rect x="10" y="26" width="28" height="14" rx="4" fill="white" opacity="0.95" />
        <ellipse cx="18" cy="14" rx="4" ry="5" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />
        <ellipse cx="30" cy="14" rx="4" ry="5" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />
      </svg>
    </div>
  );
}

function BankLogo() {
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: "linear-gradient(135deg, #fbbf24, #d97706)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: 18,
      }}
    >
      🏦
    </div>
  );
}

function WechatLogo() {
  return (
    <div
      title="微信支付"
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: "linear-gradient(135deg, #07c160, #059742)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: 20,
      }}
    >
      💚
    </div>
  );
}

function AlipayLogo() {
  return (
    <div
      title="支付宝"
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: "linear-gradient(135deg, #1677ff, #0050d7)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: 20,
      }}
    >
      💙
    </div>
  );
}

// ── 主组件 ───────────────────────────────────────────────────────────────────

export function AccountManager({
  activeUser,
  accounts,
  onAddAccount,
  onAuthorize,
  onDeleteAccount,
  onBankProfilesChanged,
}: AccountManagerProps) {
  const [bankProfiles, setBankProfiles] = useState<BankProfile[]>([]);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [addingBank, setAddingBank] = useState(false);
  const [showScriptId, setShowScriptId] = useState<string | null>(null);

  const loadBankProfiles = async () => {
    if (!activeUser) return;
    // @ts-ignore
    const data = await window.api.bankGetProfiles(activeUser.id);
    setBankProfiles(data || []);
  };

  useEffect(() => {
    loadBankProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser?.id]);

  if (!activeUser) return null;

  const handleAddBank = async () => {
    const name = newBankName.trim();
    if (!name) return;
    setAddingBank(true);
    try {
      // @ts-ignore
      await window.api.bankCreateProfile({ name, userId: activeUser.id });
      setNewBankName("");
      setShowAddBank(false);
      await loadBankProfiles();
      onBankProfilesChanged?.();
    } finally {
      setAddingBank(false);
    }
  };

  const handleDeleteBank = async (profile: BankProfile) => {
    if (!window.confirm(`确定删除银行账户【${profile.name}】及其所有流水数据吗？`)) return;
    // @ts-ignore
    await window.api.bankDeleteProfile(profile.id);
    await loadBankProfiles();
    onBankProfilesChanged?.();
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "7px 11px",
    background: "#0f172a",
    border: `1px solid ${C.borderMd}`,
    borderRadius: 7,
    color: C.text1,
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={card}>
      {/* ── 平台账户标题栏 ── */}
      <div
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0, color: C.text1 }}>2. 【{activeUser.name}】的账户</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onAddAccount("jd")}
            style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
          >
            + 京东
          </button>
          <button
            onClick={() => onAddAccount("taobao")}
            style={{ ...secondaryBtn, borderColor: "#f97316", color: "#f97316" }}
          >
            + 淘宝
          </button>
          <button
            onClick={() => onAddAccount("wechat")}
            style={{ ...secondaryBtn, borderColor: "#07c160", color: "#07c160" }}
          >
            + 微信
          </button>
          <button
            onClick={() => onAddAccount("alipay")}
            style={{ ...secondaryBtn, borderColor: "#1677ff", color: "#1677ff" }}
          >
            + 支付宝
          </button>
          <button
            onClick={() => { setShowAddBank(true); setNewBankName(""); }}
            style={{ ...secondaryBtn, borderColor: "#fbbf24", color: "#fbbf24" }}
          >
            + 银行卡
          </button>
        </div>
      </div>

      {/* ── 添加银行卡内联表单 ── */}
      {showAddBank && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: 14,
            background: "#0c1420",
            borderRadius: 8,
            border: `1px solid ${C.accent}44`,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: C.text2, whiteSpace: "nowrap" }}>银行名称：</span>
          <input
            type="text"
            autoFocus
            value={newBankName}
            onChange={(e) => setNewBankName(e.target.value)}
            placeholder="如：招商银行工资卡、工行储蓄卡"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.borderMd)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddBank();
              if (e.key === "Escape") setShowAddBank(false);
            }}
          />
          <button
            onClick={handleAddBank}
            disabled={addingBank || !newBankName.trim()}
            style={{
              padding: "7px 16px",
              background: addingBank || !newBankName.trim() ? "transparent" : `linear-gradient(135deg, ${C.accent}, ${C.violet})`,
              border: `1px solid ${addingBank || !newBankName.trim() ? C.borderMd : "transparent"}`,
              borderRadius: 7,
              color: addingBank || !newBankName.trim() ? C.text3 : "white",
              fontSize: 13, fontWeight: 600,
              cursor: addingBank || !newBankName.trim() ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            确认添加
          </button>
          <button
            onClick={() => setShowAddBank(false)}
            style={{
              padding: "7px 12px", background: "transparent",
              border: `1px solid ${C.border}`, borderRadius: 7,
              color: C.text3, fontSize: 13, cursor: "pointer",
            }}
          >
            取消
          </button>
        </div>
      )}

      {/* ── 账户列表 ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

        {/* 电商平台账户（京东、淘宝） */}
        {accounts.filter((a) => a.platform === "jd" || a.platform === "taobao").map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {a.platform === "jd" ? <JdLogo /> : <TaobaoLogo />}

              {a.status === "valid" && a.avatar && (
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: a.platform === "jd"
                      ? "linear-gradient(135deg, #ef4444, #fca5a5)"
                      : "linear-gradient(135deg, #f97316, #fdba74)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: "bold", color: "white",
                  }}
                >
                  {a.avatar}
                </div>
              )}

              <div>
                <div style={{ fontWeight: a.nickname ? 600 : 400, color: a.nickname ? C.text1 : C.text3, fontSize: 13 }}>
                  {a.nickname || "待授权账号"}
                </div>
                {a.nickname && (
                  <div style={{ fontSize: 11, color: C.text3 }}>已授权成功</div>
                )}
              </div>

              <span
                style={{
                  fontSize: 11, padding: "2px 7px", borderRadius: 4,
                  background: a.status === "valid" ? "#34d39922" : "#f43f5e22",
                  color: a.status === "valid" ? "#34d399" : "#f43f5e",
                  fontWeight: 600,
                }}
              >
                {a.status === "valid" ? "可用" : "失效/未授权"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onAuthorize(a)} style={secondaryBtn}>
                {a.status === "valid" ? "重新授权" : "去授权"}
              </button>
              <button
                onClick={() => onDeleteAccount(a)}
                style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
              >
                删除
              </button>
            </div>
          </div>
        ))}

        {/* 微信支付账户 */}
        {accounts.filter((a) => a.platform === "wechat").map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <WechatLogo />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>微信支付</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  在左侧导航「微信」中导入账单文件
                </div>
              </div>
              <span
                style={{
                  fontSize: 11, padding: "2px 7px", borderRadius: 4,
                  background: "#07c16022", color: "#07c160", fontWeight: 600,
                }}
              >
                已关联
              </span>
            </div>
            <button
              onClick={() => onDeleteAccount(a)}
              style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
            >
              删除
            </button>
          </div>
        ))}

        {/* 支付宝账户 */}
        {accounts.filter((a) => a.platform === "alipay").map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <AlipayLogo />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>支付宝</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  在左侧导航「支付宝」中导入账单文件
                </div>
              </div>
              <span
                style={{
                  fontSize: 11, padding: "2px 7px", borderRadius: 4,
                  background: "#1677ff22", color: "#1677ff", fontWeight: 600,
                }}
              >
                已关联
              </span>
            </div>
            <button
              onClick={() => onDeleteAccount(a)}
              style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
            >
              删除
            </button>
          </div>
        ))}

        {/* 银行卡账户 */}
        {bankProfiles.map((profile) => (
          <div
            key={profile.id}
            style={{
              background: "#0f172a", borderRadius: 8,
              border: "1px solid #334155", overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <BankLogo />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>
                    {profile.name}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    {profile.import_script ? (
                      <span style={{ color: C.green }}>
                        ✓ 已有导入脚本
                        {profile.file_type && ` · ${profile.file_type.toUpperCase()}`}
                      </span>
                    ) : (
                      <span style={{ color: C.text3 }}>首次导入时 AI 自动生成解析脚本</span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11, padding: "2px 7px", borderRadius: 4,
                    background: profile.import_script ? "#34d39922" : "#fbbf2422",
                    color: profile.import_script ? "#34d399" : "#fbbf24",
                    fontWeight: 600,
                  }}
                >
                  {profile.import_script ? "已配置" : "待导入"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {profile.import_script && (
                  <button
                    onClick={() => setShowScriptId(showScriptId === profile.id ? null : profile.id)}
                    style={secondaryBtn}
                  >
                    {showScriptId === profile.id ? "收起" : "查看脚本"}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteBank(profile)}
                  style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
                >
                  删除
                </button>
              </div>
            </div>

            {/* 脚本折叠展示 */}
            {showScriptId === profile.id && profile.import_script && (
              <div
                style={{
                  borderTop: "1px solid #334155",
                  padding: "12px 14px",
                  background: "#080e18",
                }}
              >
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>
                  解析脚本（可复制分享给他人）
                </div>
                <pre
                  style={{
                    margin: 0, fontSize: 10, color: "#8b949e", lineHeight: 1.6,
                    overflowX: "auto", maxHeight: 160, overflowY: "auto",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {profile.import_script}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(profile.import_script!)}
                  style={{
                    marginTop: 8, padding: "4px 12px",
                    background: "transparent", border: `1px solid ${C.borderMd}`,
                    borderRadius: 5, color: C.text2, fontSize: 11, cursor: "pointer",
                  }}
                >
                  复制脚本
                </button>
              </div>
            )}
          </div>
        ))}

        {accounts.length === 0 && bankProfiles.length === 0 && (
          <div style={{ color: C.text3, fontSize: 13, padding: "6px 0" }}>
            该成员暂无绑定的账户，点击右上角按钮添加。
          </div>
        )}
      </div>

      {/* 说明 */}
      {bankProfiles.length > 0 && (
        <div
          style={{
            marginTop: 14, padding: "10px 14px",
            background: "#080e18", borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 12, color: C.text3, lineHeight: 1.8,
          }}
        >
          💡 在左侧导航点击对应银行卡，进入后可导入流水文件（PDF / CSV / Excel），
          AI 自动生成解析脚本，确认数据后一键导入。
        </div>
      )}
    </div>
  );
}
