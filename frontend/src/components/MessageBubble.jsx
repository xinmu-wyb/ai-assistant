import { StepTrace } from "./StepTrace.jsx";
import { FileCard   } from "./FileCard.jsx";
import { XMarkdown } from "./XMarkdown.jsx";

function stripFencedCode(markdown = "") {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function hasVisibleText(text = "") {
  // 至少包含一个字母/数字/中文字符才认为是可见文本，避免只剩空白或标点时出现空气泡。
  return /[A-Za-z0-9\u4e00-\u9fff]/.test(text);
}

function Cursor() {
  return (
    <span style={{
      display: "inline-block", width: "7px", height: "15px",
      background: "currentColor", marginLeft: "2px", borderRadius: "2px",
      opacity: 0.8, animation: "cursorBlink 0.9s ease infinite",
      verticalAlign: "text-bottom",
    }} />
  );
}

export function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const assistantVisibleText = isUser ? "" : stripFencedCode(msg.content || "");
  const shouldShowTextBubble = isUser
    ? Boolean(msg.content || msg.streaming)
    : hasVisibleText(assistantVisibleText);
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-start", gap: "10px",
      marginBottom: "24px", animation: "msgIn 0.25s ease",
    }}>
      {!isUser && (
        <div style={{
          width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", marginTop: "2px",
          boxShadow: "0 0 14px rgba(99,102,241,0.3)",
        }}>✦</div>
      )}

      <div style={{
        maxWidth: "82%", display: "flex", flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
      }}>
        {/* 执行步骤（含内嵌代码/输出）*/}
        {!isUser && <StepTrace steps={msg.steps} />}

        {/* 文字 */}
        {shouldShowTextBubble && (
          <div style={{
            background: isUser ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,0.04)",
            border: isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
            padding: "11px 15px", fontSize: "14px", lineHeight: "1.72",
            color: isUser ? "#ede9fe" : "#cbd5e1",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {isUser ? msg.content : <XMarkdown content={msg.content} hideFencedCode />}
            {isUser && msg.streaming && <Cursor />}
          </div>
        )}

        {/* 附件 */}
        {isUser && msg.attachments?.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginTop: "6px", justifyContent: "flex-end" }}>
            {msg.attachments.map((a, i) => (
              <span key={i} style={{
                fontSize: "11px", color: "#818cf8",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.18)",
                borderRadius: "5px", padding: "2px 8px",
              }}>📎 {a}</span>
            ))}
          </div>
        )}

        {/* 文件卡片 */}
        {!isUser && msg.files?.map((f, i) => <FileCard key={i} file={f} />)}
      </div>

      <style>{`
        @keyframes msgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cursorBlink { 0%,100%{opacity:0.8} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
