import React from "react";
import { C } from "../../styles";

export type PlatformView =
  // 电商平台
  | "taobao"
  | "jd"
  | "pdd"
  | "sams"
  | "other_shop"
  // 支付平台
  | "alipay"
  | "wechat"
  | "unionpay"
  // 银行卡
  | "bank"
  | "ccb"
  | "abc"
  | "icbc"
  | "boc"
  | "postal"
  | "citic"
  | "minsheng"
  | "other_bank";

interface PlatformCard {
  id: PlatformView;
  label: string;
  subLabel: string;
  icon: string;
  gradient: string;
  glowColor: string;
  tag: "爬取" | "Excel导入" | "PDF导入";
  tagColor: string;
}

const CARDS: PlatformCard[] = [
  {
    id: "taobao",
    label: "淘宝订单",
    subLabel: "Taobao Orders",
    icon: "🛍️",
    gradient: "linear-gradient(135deg, #ff6900 0%, #ff4400 100%)",
    glowColor: "rgba(255,105,0,0.35)",
    tag: "爬取",
    tagColor: "#f97316",
  },
  {
    id: "jd",
    label: "京东订单",
    subLabel: "JD Orders",
    icon: "📦",
    gradient: "linear-gradient(135deg, #e2231a 0%, #b71c1c 100%)",
    glowColor: "rgba(226,35,26,0.35)",
    tag: "爬取",
    tagColor: "#ef4444",
  },
  {
    id: "alipay",
    label: "支付宝账单",
    subLabel: "Alipay Bills",
    icon: "💙",
    gradient: "linear-gradient(135deg, #1677ff 0%, #0050d7 100%)",
    glowColor: "rgba(22,119,255,0.35)",
    tag: "Excel导入",
    tagColor: "#38bdf8",
  },
  {
    id: "wechat",
    label: "微信账单",
    subLabel: "WeChat Bills",
    icon: "💚",
    gradient: "linear-gradient(135deg, #07c160 0%, #059742 100%)",
    glowColor: "rgba(7,193,96,0.35)",
    tag: "Excel导入",
    tagColor: "#34d399",
  },
  {
    id: "bank",
    label: "招商流水",
    subLabel: "CMB Bank",
    icon: "🏦",
    gradient: "linear-gradient(135deg, #d4a017 0%, #a07010 100%)",
    glowColor: "rgba(212,160,23,0.35)",
    tag: "PDF导入",
    tagColor: "#fbbf24",
  },
];

interface DashboardHomeProps {
  onSelectPlatform: (p: PlatformView) => void;
}

export function DashboardHome({ onSelectPlatform }: DashboardHomeProps) {
  const [hovered, setHovered] = React.useState<PlatformView | null>(null);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 30px",
        gap: 32,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            color: C.text1,
            letterSpacing: "-0.3px",
          }}
        >
          选择数据来源
        </h2>
        <p style={{ margin: "8px 0 0", color: C.text2, fontSize: 13 }}>
          点击平台查看账单数据，或拉取最新记录
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 900,
          width: "100%",
        }}
      >
        {CARDS.map((card) => {
          const isHovered = hovered === card.id;
          return (
            <div
              key={card.id}
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectPlatform(card.id)}
              style={{
                width: 158,
                padding: "24px 18px 20px",
                borderRadius: 14,
                background: isHovered ? card.gradient : C.bgSurface,
                border: `1px solid ${isHovered ? "transparent" : C.border}`,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 11,
                transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
                transform: isHovered ? "translateY(-3px) scale(1.01)" : "none",
                boxShadow: isHovered
                  ? `0 12px 32px ${card.glowColor}`
                  : "0 2px 8px rgba(0,0,0,0.3)",
                position: "relative",
                userSelect: "none",
              }}
            >
              {/* 导入方式标签 */}
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: isHovered ? "rgba(255,255,255,0.2)" : `${card.tagColor}22`,
                  color: isHovered ? "rgba(255,255,255,0.9)" : card.tagColor,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                {card.tag}
              </span>

              <span style={{ fontSize: 44, lineHeight: 1 }}>{card.icon}</span>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isHovered ? "#fff" : C.text1,
                    marginBottom: 3,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isHovered ? "rgba(255,255,255,0.6)" : C.text2,
                    letterSpacing: "0.02em",
                  }}
                >
                  {card.subLabel}
                </div>
              </div>

              {/* 底部箭头 */}
              <span
                style={{
                  fontSize: 18,
                  color: isHovered ? "rgba(255,255,255,0.8)" : "#475569",
                  transition: "transform 0.2s",
                  transform: isHovered ? "translateX(4px)" : "none",
                }}
              >
                →
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
