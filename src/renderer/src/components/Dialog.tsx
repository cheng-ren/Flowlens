import { primaryBtn, secondaryBtn } from "../styles";

export interface DialogState {
  isOpen: boolean;
  title: string;
  placeholder: string;
  type: string;
  onSubmit: (name: string) => void;
}

interface DialogProps {
  dialog: DialogState | null;
  setDialog: (d: DialogState | null) => void;
  canCancel: boolean;
}

export function Dialog({ dialog, setDialog, canCancel }: DialogProps) {
  if (!dialog?.isOpen) return null;

  const handleConfirm = (input: HTMLInputElement) => {
    if (input.value.trim()) dialog.onSubmit(input.value.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: 30,
          borderRadius: 12,
          width: 350,
          border: "1px solid #334155",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
      >
        <h3 style={{ margin: "0 0 20px 0" }}>{dialog.title}</h3>
        <input
          autoFocus
          placeholder={dialog.placeholder}
          style={{
            width: "100%",
            padding: "10px 15px",
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 20,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              dialog.onSubmit(e.currentTarget.value.trim());
            }
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {canCancel && (
            <button onClick={() => setDialog(null)} style={secondaryBtn}>
              取消
            </button>
          )}
          <button
            onClick={(e) => {
              const input = e.currentTarget.parentElement
                ?.previousElementSibling as HTMLInputElement;
              handleConfirm(input);
            }}
            style={primaryBtn}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
