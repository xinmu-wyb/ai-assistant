/**
 * ChatWindow.jsx — 主对话区域
 * 包含：消息列表、输入框、文件上传、发送按钮
 */

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble.jsx";

// ── 图标 ──────────────────────────────────────────────────
function SendIcon({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function SpinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate"
          from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

// ── 欢迎屏 ────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: "📄", title: "生成 Word 文档",   text: "帮我生成一份项目需求说明文档，包含背景、目标、功能模块三个章节" },
  { icon: "📊", title: "制作 PPT",         text: "制作一份季度销售汇报 pptx，包含封面、数据摘要、趋势分析、总结" },
  { icon: "🔍", title: "代码审查",         text: "请帮我 review 以下代码并指出潜在问题：" },
  { icon: "✍️", title: "测试用例文档",     text: "帮我写一份用户登录功能的软件测试用例文档 docx" },
];

function WelcomeScreen({ onSuggest }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1, padding: "40px 24px",
      animation: "fadeUp 0.4s ease",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "16px",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px", marginBottom: "20px",
        boxShadow: "0 0 32px rgba(99,102,241,0.4)",
      }}>✦</div>

      <h2 style={{
        fontSize: "22px", fontWeight: 700,
        background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: "8px",
      }}>今天需要什么帮助？</h2>

      <p style={{ color: "#475569", fontSize: "13.5px", marginBottom: "32px" }}>
        生成文档 · 制作 PPT · 代码审查 · 通用问答
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "10px", width: "100%", maxWidth: "520px",
      }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => onSuggest(s.text)}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px", padding: "16px",
              cursor: "pointer", textAlign: "left",
              transition: "all 0.18s", color: "#94a3b8",
              animation: `fadeUp 0.35s ease ${i * 0.07}s both`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(99,102,241,0.08)";
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
              e.currentTarget.style.color = "#c7d2fe";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{s.icon}</div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px", color: "#e2e8f0" }}>
              {s.title}
            </div>
            <div style={{ fontSize: "11.5px", opacity: 0.7, lineHeight: 1.5 }}>
              {s.text.slice(0, 36)}…
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l14 9-14 9V3z" />
    </svg>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export function ChatWindow({ messages, loading, paused, onPause, onResume, onSend }) {
  const [input,        setInput]        = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const bottomRef  = useRef(null);
  const scrollRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const autoFollowRef = useRef(true);

  const isNearBottom = (el, threshold = 80) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

  useEffect(() => {
    if (autoFollowRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() && !pendingFiles.length) return;
    autoFollowRef.current = true;
    onSend(input.trim(), pendingFiles);
    setInput("");
    setPendingFiles([]);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (input.trim().length > 0 || pendingFiles.length > 0) && !loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        onScroll={(e) => { autoFollowRef.current = isNearBottom(e.currentTarget); }}
        style={{ flex: 1, overflowY: "auto", padding: "24px 0 8px" }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px",
          display: "flex", flexDirection: "column", minHeight: "100%" }}>
          {messages.length === 0
            ? <WelcomeScreen onSuggest={(t) => { setInput(t); setTimeout(() => inputRef.current?.focus(), 50); }} />
            : messages.map(m => <MessageBubble key={m.id} msg={m} />)
          }
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 输入区 */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "14px 24px 20px",
        background: "rgba(9,13,26,0.85)", backdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>

          {/* 待上传文件预览 */}
          {pendingFiles.length > 0 && (
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "10px" }}>
              {pendingFiles.map((f, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "8px", padding: "4px 10px",
                  fontSize: "12px", color: "#a5b4fc",
                }}>
                  <span>📎 {f.name}</span>
                  <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "#6366f1", padding: "0", fontSize: "14px", lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div style={{
            display: "flex", alignItems: "flex-end", gap: "8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "16px", padding: "10px 10px 10px 14px",
          }}>
            {/* 附件按钮 */}
            <button
              onClick={() => fileRef.current?.click()}
              title="上传文件"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#374151", padding: "5px", borderRadius: "7px",
                display: "flex", alignItems: "center", flexShrink: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#6366f1"}
              onMouseLeave={e => e.currentTarget.style.color = "#374151"}
            >
              <ClipIcon />
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: "none" }}
              onChange={e => {
                setPendingFiles(prev => [...prev, ...Array.from(e.target.files)]);
                e.target.value = "";
              }} />

            {/* 文字输入 */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="输入需求…（Shift+Enter 换行）"
              rows={1}
              style={{
                flex: 1, background: "none", border: "none",
                color: "#e2e8f0", fontSize: "14px", lineHeight: "1.65",
                fontFamily: "inherit", maxHeight: "180px", overflowY: "auto",
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
              }}
            />

            {/* 暂停/继续按钮 */}
            {loading && (
              <button
                onClick={paused ? onResume : onPause}
                title={paused ? "继续生成" : "暂停生成"}
                style={{
                  width: "36px", height: "36px", borderRadius: "11px",
                  border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
                  background: "rgba(255,255,255,0.05)",
                  color: paused ? "#34d399" : "#f59e0b",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.18s",
                }}
              >
                {paused ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}

            {/* 发送按钮 */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width: "36px", height: "36px", borderRadius: "11px",
                border: "none", flexShrink: 0,
                background: canSend
                  ? "linear-gradient(135deg, #6366f1, #7c3aed)"
                  : "rgba(255,255,255,0.05)",
                color: canSend ? "#fff" : "#2d3748",
                cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.18s",
                boxShadow: canSend ? "0 0 14px rgba(99,102,241,0.35)" : "none",
              }}
            >
              {loading ? <SpinIcon /> : <SendIcon />}
            </button>
          </div>

          <p style={{
            textAlign: "center", fontSize: "11px", color: "#1e293b", marginTop: "9px",
          }}>
            agno · agent-infra/sandbox · FastAPI
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(7px); }
          to   { opacity:1; transform:translateY(0); }
        }
        textarea:focus, button:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
      `}</style>
    </div>
  );
}
