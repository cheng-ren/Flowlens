import React from "react";
import { secondaryBtn, selectStyle } from "../../styles";
import { MemberManager } from "./MemberManager";
import { AccountManager } from "./AccountManager";

interface SettingsViewProps {
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

export function SettingsView({
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
}: SettingsViewProps) {
  return (
    <div style={{ padding: 30, maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: 0 }}>家庭中心与账号配置</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={activeFamily.id}
            onChange={(e) => {
              const f = families.find((f) => f.id === e.target.value);
              if (f) onSelectFamily(f);
            }}
            style={selectStyle}
          >
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                切换至: {f.name}
              </option>
            ))}
          </select>
          <button onClick={onAddFamily} style={secondaryBtn}>
            + 新增家庭
          </button>
          <button
            onClick={onDeleteFamily}
            style={{ ...secondaryBtn, borderColor: "#ef4444", color: "#ef4444" }}
          >
            删除当前家庭
          </button>
        </div>
      </div>

      <MemberManager
        activeFamily={activeFamily}
        users={users}
        activeUser={activeUser}
        onSelectUser={onSelectUser}
        onAddUser={onAddUser}
        onDeleteUser={onDeleteUser}
      />

      <AccountManager
        activeUser={activeUser}
        accounts={accounts}
        onAddAccount={onAddAccount}
        onAuthorize={onAuthorize}
        onDeleteAccount={onDeleteAccount}
      />
    </div>
  );
}
