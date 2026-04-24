import { iconBtn, primaryBtn, secondaryBtn } from "../styles";
import type { ViewType } from "../App";

const VIEW_LABELS: Partial<Record<ViewType, string>> = {
  taobao: "淘宝订单",
  jd: "京东订单",
  alipay: "支付宝账单",
  wechat: "微信账单",
  bank: "招商流水",
  settings: "设置",
};

interface AppHeaderProps {
  activeFamily: any;
  view: ViewType;
  setView: (v: ViewType) => void;
}

export function AppHeader({ activeFamily, view, setView }: AppHeaderProps) {
  if (!activeFamily) return null;

  const isHome = view === "home";
  const currentLabel = VIEW_LABELS[view];

  return (
    <header
      style={{
        height: 70,
        borderBottom: "1px solid #334155",
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        justifyContent: "space-between",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}
    >
      {/* 左侧：logo + 家庭名 + 当前页面面包屑 */}
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: "bold",
            color: "white",
            boxShadow: "0 4px 10px rgba(56, 189, 248, 0.4)",
            flexShrink: 0,
          }}
        >
          {activeFamily.avatar || activeFamily.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {activeFamily.name}
            </h2>
            {currentLabel && (
              <>
                <span style={{ color: "#334155", fontSize: 16 }}>›</span>
                <span style={{ fontSize: 15, color: "#94a3b8", fontWeight: 500 }}>
                  {currentLabel}
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize: 12, color: "#475569" }}>财流镜 FlowLens</span>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {isHome ? (
          <button onClick={() => setView("settings")} style={iconBtn} title="设置">
            ⚙️
          </button>
        ) : view === "settings" ? (
          <button onClick={() => setView("home")} style={primaryBtn}>
            ← 返回首页
          </button>
        ) : (
          <>
            <button
              onClick={() => setView("home")}
              style={{
                ...secondaryBtn,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← 返回首页
            </button>
            <button onClick={() => setView("settings")} style={iconBtn} title="设置">
              ⚙️
            </button>
          </>
        )}
      </div>
    </header>
  );
}
