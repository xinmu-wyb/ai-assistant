/**
 * MessageBubble.jsx — 消息气泡
 * 包含：用户消息、assistant 消息、步骤展示、附件、文件卡片、打字光标
 */

import { StepTrace } from "./StepTrace.jsx";
import { FileCard   } from "./FileCard.jsx";

function Cursor() {
  return (
    <span style={{
      display: "inline-block", width: "7px", height: "15px",
      background: "currentColor", marginLeft: "2px",
      borderRadius: "2px", opacity: 0.8,
      animation: "cursorBlink 0.9s ease infinite",
      verticalAlign: "text-bottom",
    }} />
  );
}

function AttachmentBadge({ name }) {
  return (
    <span style={{
      fontSize: "11px", color: "#818cf8",
      background: "rgba(99,102,241,0.08)",
      border: "1px solid rgba(99,102,241,0.18)",
      borderRadius: "5px", padding: "2px 8px",
      display: "inline-flex", alignItems: "center", gap: "4px",
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
      </svg>
      {name}
    </span>
  );
}

export function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-start",
      gap: "10px",
      marginBottom: "24px",
      animation: "msgIn 0.25s ease",
    }}>

      {/* Assistant 头像 */}
      {!isUser && (
        <div style={{
          width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", marginTop: "2px",
          boxShadow: "0 0 14px rgba(99,102,241,0.3)",
        }}>✦</div>
      )}

      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start" }}>

        {/* 执行步骤（仅 assistant） */}
        {!isUser && <StepTrace steps={msg.steps} />}

        {/* 文字内容 */}
        {(msg.content || msg.streaming) && (
          <div style={{
            background: isUser
              ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
              : "rgba(255,255,255,0.04)",
            border: isUser
              ? "none"
              : "1px solid rgba(255,255,255,0.07)",
            borderRadius: isUser
              ? "18px 4px 18px 18px"
              : "4px 18px 18px 18px",
            padding: "11px 15px",
            fontSize: "14px", lineHeight: "1.72",
            color: isUser ? "#ede9fe" : "#cbd5e1",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            backdropFilter: isUser ? "none" : "blur(6px)",
          }}>
            {msg.content}
            {msg.streaming && <Cursor />}
          </div>
        )}

        {/* 附件标签 */}
        {isUser && msg.attachments?.length > 0 && (
          <div style={{
            display: "flex", gap: "6px", flexWrap: "wrap",
            marginTop: "6px", justifyContent: "flex-end",
          }}>
            {msg.attachments.map((a, i) => <AttachmentBadge key={i} name={a} />)}
          </div>
        )}

        {/* 生成的文件卡片 */}
        {!isUser && msg.files?.map((f, i) => (
          <FileCard key={i} file={f} />
        ))}
      </div>

      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 0.8; }
          50%       { opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
