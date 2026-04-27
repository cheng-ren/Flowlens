import React, { useState, useEffect } from "react";
import type { ViewType } from "../App";
import { C } from "../styles";

export interface BankProfileItem {
  id: string;
  name: string;
}

// ── 数据定义 ──────────────────────────────────────────────────────────────────

type MenuStatus = "ready" | "soon";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  status: MenuStatus;
}

interface NavGroup {
  type: "group";
  label: string;
  icon: string;
  defaultExpanded: boolean;
  children: MenuItem[];
}

interface NavSingle {
  type: "single";
  id: string;
  label: string;
  icon: string;
}

type NavEntry = NavSingle | NavGroup;

const STATIC_NAV_WITHOUT_BANK: NavEntry[] = [
  { type: "single", id: "home", label: "财务概览", icon: "▦" },
  { type: "single", id: "assetFlow", label: "资产流转", icon: "⇌" },
  {
    type: "group",
    label: "电商平台",
    icon: "🛒",
    defaultExpanded: true,
    children: [
      { id: "taobao",     label: "淘宝",   icon: "🛍️", status: "ready" },
      { id: "jd",         label: "京东",   icon: "📦", status: "ready" },
      { id: "pdd",        label: "拼多多", icon: "🟠", status: "soon"  },
      { id: "sams",       label: "山姆",   icon: "🏪", status: "soon"  },
      { id: "other_shop", label: "其他",   icon: "🏬", status: "soon"  },
    ],
  },
  {
    type: "group",
    label: "支付平台",
    icon: "💳",
    defaultExpanded: true,
    children: [
      { id: "wechat",   label: "微信",   icon: "💚", status: "ready" },
      { id: "alipay",   label: "支付宝", icon: "💙", status: "ready" },
      { id: "unionpay", label: "云闪付", icon: "🔴", status: "soon"  },
    ],
  },
];

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface SideNavProps {
  activeFamily: any;
  view: ViewType;
  bankProfiles: BankProfileItem[];
  onNavigate: (v: ViewType) => void;
  onOpenSettings: () => void;
}

export function SideNav({ activeFamily, view, bankProfiles, onNavigate, onOpenSettings }: SideNavProps) {
  const buildNav = (): NavEntry[] => {
    const bankChildren: MenuItem[] = bankProfiles.map((p) => ({
      id: `bank:${p.id}`,
      label: p.name,
      icon: "🏦",
      status: "ready" as MenuStatus,
    }));

    return [
      ...STATIC_NAV_WITHOUT_BANK,
      {
        type: "group",
        label: "银行卡",
        icon: "🏦",
        defaultExpanded: bankChildren.length > 0,
        children: bankChildren,
      },
    ];
  };

  const nav = buildNav();
  const initExpanded: Record<string, boolean> = {};
  nav.forEach((e) => {
    if (e.type === "group") initExpanded[e.label] = e.defaultExpanded;
  });
  const [expanded, setExpanded] = useState(initExpanded);

  // 当用户在设置中添加了银行后，自动展开银行卡分组
  useEffect(() => {
    if (bankProfiles.length > 0) {
      setExpanded((prev) => ({ ...prev, "银行卡": true }));
    }
  }, [bankProfiles.length]);

  return (
    <nav
      style={{
        width: 220,
        height: "100vh",
        background: C.bgSidebar,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── macOS 红绿灯拖拽区 ────────────── */}
      <div
        style={{
          height: 38,
          flexShrink: 0,
          // @ts-ignore
          WebkitAppRegion: "drag",
        }}
      />

      {/* ── 家庭信息 ─────────────────────── */}
      <div
        style={{
          padding: "0 14px 14px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          // @ts-ignore
          WebkitAppRegion: "no-drag",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${C.accent}, ${C.violet})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              boxShadow: `0 4px 14px rgba(77,156,240,0.25)`,
              flexShrink: 0,
              letterSpacing: -0.5,
            }}
          >
            {activeFamily?.avatar || activeFamily?.name?.charAt(0)?.toUpperCase() || "F"}
          </div>
          <div style={{ overflow: "hidden", minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.text1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
              }}
            >
              {activeFamily?.name || "加载中..."}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.text3,
                marginTop: 1,
                letterSpacing: "0.03em",
              }}
            >
              财流镜 FlowLens
            </div>
          </div>
        </div>
      </div>

      {/* ── 导航菜单 ─────────────────────── */}
      {/* @ts-ignore */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 4px", WebkitAppRegion: "no-drag" }}>
        {nav.map((entry) => {
          if (entry.type === "single") {
            return (
              <NavItem
                key={entry.id}
                label={entry.label}
                icon={entry.icon}
                isActive={view === entry.id}
                onClick={() => onNavigate(entry.id as ViewType)}
                isText={entry.icon === "▦"}
              />
            );
          }

          const isOpen = expanded[entry.label];

          return (
            <div key={entry.label} style={{ marginTop: 4 }}>
              {/* 分组标题 */}
              <GroupHeader
                label={entry.label}
                icon={entry.icon}
                isOpen={isOpen}
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [entry.label]: !prev[entry.label] }))
                }
              />

              {/* 子项（带淡入动画） */}
              <div
                style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? Math.max(entry.children.length, 1) * 38 + "px" : "0px",
                  transition: "max-height 0.22s cubic-bezier(0.4,0,0.2,1)",
                  opacity: isOpen ? 1 : 0,
                  transitionProperty: "max-height, opacity",
                }}
              >
                {entry.children.length === 0 && entry.label === "银行卡" ? (
                  <div
                    style={{
                      padding: "6px 18px 6px 30px",
                      fontSize: 11,
                      color: C.text3,
                      cursor: "pointer",
                    }}
                    onClick={onOpenSettings}
                  >
                    + 在设置中添加银行
                  </div>
                ) : (
                  entry.children.map((child) => (
                    <NavItem
                      key={child.id}
                      label={child.label}
                      icon={child.icon}
                      isActive={view === child.id}
                      isSoon={child.status === "soon"}
                      onClick={() =>
                        child.status !== "soon" && onNavigate(child.id as ViewType)
                      }
                      indent
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 底部设置按钮 ─────────────────── */}
      <div
        style={{
          padding: "10px 10px 12px",
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          // @ts-ignore
          WebkitAppRegion: "no-drag",
        }}
      >
        <SettingsBtn onClick={onOpenSettings} />
      </div>
    </nav>
  );
}

// ── 子组件 ────────────────────────────────────────────────────────────────────

function GroupHeader({
  label,
  icon,
  isOpen,
  onClick,
}: {
  label: string;
  icon: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px 0 14px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: hovered ? C.text1 : C.text2,
        transition: "color 0.15s",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
        {label}
      </span>
      {/* 旋转箭头 */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: 4,
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          fontSize: 14,
          color: hovered ? C.text2 : C.text3,
        }}
      >
        ›
      </span>
    </button>
  );
}

function NavItem({
  label,
  icon,
  isActive,
  isSoon = false,
  onClick,
  indent = false,
  isText = false,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  isSoon?: boolean;
  onClick: () => void;
  indent?: boolean;
  isText?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ padding: "1px 8px" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          paddingLeft: indent ? 18 : 10,
          borderRadius: 7,
          background: isActive
            ? C.bgActive
            : hovered && !isSoon
            ? "rgba(240,246,255,0.05)"
            : "transparent",
          border: "none",
          outline: isActive ? `1px solid rgba(77,156,240,0.2)` : "none",
          cursor: isSoon ? "default" : "pointer",
          transition: "background 0.12s",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive
              ? C.accentSoft
              : isSoon
              ? C.text3
              : hovered
              ? C.text1
              : "#c9d1d9",
            transition: "color 0.12s",
          }}
        >
          {isText ? (
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: isActive
                  ? `rgba(77,156,240,0.2)`
                  : hovered
                  ? "rgba(240,246,255,0.07)"
                  : "rgba(240,246,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: isActive ? C.accent : C.text3,
                fontWeight: 700,
                flexShrink: 0,
                transition: "background 0.12s",
              }}
            >
              ▦
            </span>
          ) : (
            <span
              style={{
                fontSize: 14,
                lineHeight: 1,
                opacity: isSoon ? 0.35 : 1,
              }}
            >
              {icon}
            </span>
          )}
          <span style={{ opacity: isSoon ? 0.45 : 1 }}>{label}</span>
        </span>

        {isSoon && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.03)",
              color: "#2a3346",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.05)",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            即将
          </span>
        )}
      </button>
    </div>
  );
}

function SettingsBtn({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 12px",
        borderRadius: 7,
        background: hovered ? "rgba(240,246,255,0.05)" : "transparent",
        border: `1px solid ${hovered ? C.borderMd : C.border}`,
        color: hovered ? C.text2 : C.text3,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 400,
        transition: "all 0.15s",
        textAlign: "left",
      }}
    >
      <SettingsIcon size={15} color={hovered ? C.text2 : C.text3} />
      设置
    </button>
  );
}

function SettingsIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M8 10a2 2 0 100-4 2 2 0 000 4z"
        fill={color}
        opacity="0.9"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.07 1.13a1 1 0 011.86 0l.27.75a5.07 5.07 0 011.2.7l.77-.2a1 1 0 011.11.58l.33.73a1 1 0 01-.38 1.26l-.67.43a5.1 5.1 0 010 1.4l.67.43a1 1 0 01.38 1.26l-.33.73a1 1 0 01-1.11.58l-.77-.2a5.07 5.07 0 01-1.2.7l-.27.75a1 1 0 01-1.86 0l-.27-.75a5.07 5.07 0 01-1.2-.7l-.77.2a1 1 0 01-1.11-.58l-.33-.73a1 1 0 01.38-1.26l.67-.43a5.1 5.1 0 010-1.4l-.67-.43a1 1 0 01-.38-1.26l.33-.73a1 1 0 011.11-.58l.77.2a5.07 5.07 0 011.2-.7l.27-.75zm.93 2.37a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
        fill={color}
        opacity="0.55"
      />
    </svg>
  );
}
