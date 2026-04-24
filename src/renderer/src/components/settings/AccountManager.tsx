import React from "react";
import { card, secondaryBtn } from "../../styles";

interface AccountManagerProps {
  activeUser: any;
  accounts: any[];
  onAddAccount: (platform: string) => void;
  onAuthorize: (account: any) => void;
  onDeleteAccount: (account: any) => void;
}

function JdLogo() {
  return (
    <div
      title="京东"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "#e2231a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width="26"
        height="26"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="2"
          y="36"
          fontSize="34"
          fontWeight="900"
          fontFamily="Arial Black, Arial, sans-serif"
          fill="white"
        >
          JD
        </text>
      </svg>
    </div>
  );
}

function TaobaoLogo() {
  return (
    <div
      title="淘宝"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "linear-gradient(135deg, #ff6900, #ff4400)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width="24"
        height="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="24" cy="19" rx="14" ry="11" fill="white" opacity="0.95" />
        <ellipse
          cx="24"
          cy="19"
          rx="10"
          ry="7.5"
          fill="none"
          stroke="#ff6900"
          strokeWidth="2.5"
        />
        <rect x="10" y="26" width="28" height="14" rx="4" fill="white" opacity="0.95" />
        <ellipse
          cx="18"
          cy="14"
          rx="4"
          ry="5"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.9"
        />
        <ellipse
          cx="30"
          cy="14"
          rx="4"
          ry="5"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

export function AccountManager({
  activeUser,
  accounts,
  onAddAccount,
  onAuthorize,
  onDeleteAccount,
}: AccountManagerProps) {
  if (!activeUser) return null;

  return (
    <div style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0 }}>2. 【{activeUser.name}】的授权账户</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onAddAccount("jd")}
            style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
          >
            + 添加京东
          </button>
          <button
            onClick={() => onAddAccount("taobao")}
            style={{ ...secondaryBtn, borderColor: "#f97316", color: "#f97316" }}
          >
            + 添加淘宝
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {accounts.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 15,
              background: "#0f172a",
              borderRadius: 8,
              border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
              {a.platform === "jd" ? <JdLogo /> : <TaobaoLogo />}

              {a.status === "valid" && a.avatar && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background:
                      a.platform === "jd"
                        ? "linear-gradient(135deg, #ef4444, #fca5a5)"
                        : "linear-gradient(135deg, #f97316, #fdba74)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "white",
                  }}
                >
                  {a.avatar}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontWeight: a.nickname ? 600 : 400,
                    color: a.nickname ? "#f8fafc" : "#94a3b8",
                  }}
                >
                  {a.nickname || "待授权账号"}
                </span>
                {a.nickname && (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>已授权成功</span>
                )}
              </div>

              {a.status === "valid" ? (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    background: "#34d39933",
                    color: "#34d399",
                    borderRadius: 4,
                  }}
                >
                  可用
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    background: "#f43f5e33",
                    color: "#f43f5e",
                    borderRadius: 4,
                  }}
                >
                  失效/未授权
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
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
        {accounts.length === 0 && (
          <div style={{ color: "#64748b" }}>该成员暂无绑定的平台账户。</div>
        )}
      </div>
    </div>
  );
}
