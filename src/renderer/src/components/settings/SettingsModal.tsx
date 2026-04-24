import React, { useState, useEffect } from "react";
import { SettingsView } from "./SettingsView";
import { LLMSettingsView } from "./LLMSettingsView";
import { C } from "../../styles";

type SettingsTab = "account" | "llm";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "account",
    label: "账户设置",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" fill="currentColor" opacity="0.8" />
        <path
          d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    id: "llm",
    label: "大模型设置",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.8" />
        <path d="M5 8h2M9 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        <circle cx="8" cy="2" r="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  families: any[];
  activeFamily: any;
  onSelectFamily: (f: any) => void;
  onAddFamily: () => void;
  onDeleteFamily: () => void;
  users: any[];
  activeUser: any;
  onSelectUser: (u: any) => void;
  onAddUser: () => void;
  onDeleteUser: (u: any) => void;
  accounts: any[];
  onAddAccount: (platform: string) => void;
  onAuthorize: (account: any) => void;
  onDeleteAccount: (account: any) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  families,
  activeFamily,
  onSelectFamily,
  onAddFamily,
  onDeleteFamily,
  users,
  activeUser,
  onSelectUser,
  onAddUser,
  onDeleteUser,
  accounts,
  onAddAccount,
  onAuthorize,
  onDeleteAccount,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { transform: scale(0.96) translateY(6px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);   opacity: 1; }
        }
      `}</style>

      {/* 遮罩 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 50000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(6px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* 弹窗主体 */}
        <div
          style={{
            width: 860,
            maxWidth: "96vw",
            height: 620,
            maxHeight: "90vh",
            background: C.bgBase,
            borderRadius: 14,
            border: `1px solid ${C.borderMd}`,
            display: "flex",
            overflow: "hidden",
            boxShadow: "0 32px 64px rgba(0,0,0,0.85)",
            animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          {/* 左侧菜单 */}
          <div
            style={{
              width: 186,
              background: C.bgSidebar,
              borderRight: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {/* 标题 */}
            <div
              style={{
                padding: "18px 16px 14px",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 10a2 2 0 100-4 2 2 0 000 4z"
                    fill={C.text2}
                  />
                  <path
                    fillRule="evenodd"
                    d="M7.07 1.13a1 1 0 011.86 0l.27.75a5.07 5.07 0 011.2.7l.77-.2a1 1 0 011.11.58l.33.73a1 1 0 01-.38 1.26l-.67.43a5.1 5.1 0 010 1.4l.67.43a1 1 0 01.38 1.26l-.33.73a1 1 0 01-1.11.58l-.77-.2a5.07 5.07 0 01-1.2.7l-.27.75a1 1 0 01-1.86 0l-.27-.75a5.07 5.07 0 01-1.2-.7l-.77.2a1 1 0 01-1.11-.58l-.33-.73a1 1 0 01.38-1.26l.67-.43a5.1 5.1 0 010-1.4l-.67-.43a1 1 0 01-.38-1.26l.33-.73a1 1 0 011.11-.58l.77.2a5.07 5.07 0 011.2-.7l.27-.75z"
                    fill={C.text3}
                  />
                </svg>
                设置
              </span>
            </div>

            {/* Tab 列表 */}
            <div style={{ padding: "8px 8px 0" }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <SettingsTabItem
                    key={tab.id}
                    label={tab.label}
                    icon={tab.icon}
                    isActive={isActive}
                    onClick={() => setActiveTab(tab.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* 右侧内容 */}
          <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            {/* 关闭按钮 */}
            <CloseButton onClick={onClose} />

            {activeTab === "account" && (
              <SettingsView
                families={families}
                activeFamily={activeFamily}
                onSelectFamily={onSelectFamily}
                onAddFamily={onAddFamily}
                onDeleteFamily={onDeleteFamily}
                users={users}
                activeUser={activeUser}
                onSelectUser={onSelectUser}
                onAddUser={onAddUser}
                onDeleteUser={onDeleteUser}
                accounts={accounts}
                onAddAccount={onAddAccount}
                onAuthorize={onAuthorize}
                onDeleteAccount={onDeleteAccount}
              />
            )}

            {activeTab === "llm" && <LLMSettingsView />}
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsTabItem({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
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
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 10px",
        borderRadius: 7,
        background: isActive
          ? C.bgActive
          : hovered
          ? "rgba(240,246,255,0.04)"
          : "transparent",
        border: "none",
        outline: isActive ? `1px solid rgba(77,156,240,0.18)` : "none",
        color: isActive ? C.accentSoft : hovered ? C.text1 : C.text2,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        textAlign: "left",
        transition: "all 0.12s",
        marginBottom: 2,
      }}
    >
      <span style={{ display: "flex", opacity: isActive ? 1 : 0.7 }}>{icon}</span>
      {label}
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="关闭 (ESC)"
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        width: 26,
        height: 26,
        borderRadius: 6,
        background: hovered ? "#f85149" : "rgba(240,246,255,0.06)",
        border: `1px solid ${hovered ? "#f85149" : C.border}`,
        color: hovered ? "#fff" : C.text3,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 400,
        transition: "all 0.15s",
        zIndex: 10,
        lineHeight: 1,
      }}
    >
      ✕
    </button>
  );
}
