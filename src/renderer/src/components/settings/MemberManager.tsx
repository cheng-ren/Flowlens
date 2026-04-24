import React from "react";
import { card, secondaryBtn, C } from "../../styles";

interface MemberManagerProps {
  activeFamily: any;
  users: any[];
  activeUser: any;
  onSelectUser: (user: any) => void;
  onAddUser: () => void;
  onDeleteUser: (user: any) => void;
}

export function MemberManager({
  activeFamily,
  users,
  activeUser,
  onSelectUser,
  onAddUser,
  onDeleteUser,
}: MemberManagerProps) {
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
        <h3 style={{ margin: 0 }}>1. 成员管理 ({activeFamily.name})</h3>
        <button onClick={onAddUser} style={secondaryBtn}>
          + 添加成员
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {users.map((u) => {
          const isActive = activeUser?.id === u.id;
          return (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px 5px 20px",
                borderRadius: 8,
                background: isActive ? C.accent : C.bgHover,
                color: isActive ? "#fff" : C.text1,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <div onClick={() => onSelectUser(u)} style={{ cursor: "pointer" }}>
                {u.name}
              </div>
              <button
                onClick={() => onDeleteUser(u)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: isActive ? "rgba(255,255,255,0.7)" : C.text2,
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "0 5px",
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        {users.length === 0 && (
          <span style={{ color: C.text3, fontSize: 13 }}>暂无成员，请添加</span>
        )}
      </div>
    </div>
  );
}
