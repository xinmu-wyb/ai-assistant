/**
 * App.jsx — 根组件
 * 负责：全局状态、顶栏、将 useSSE + ChatWindow 串联
 */

import { useState } from "react";
import { ChatWindow } from "./components/ChatWindow.jsx";
import { useSSE      } from "./hooks/useSSE.js";

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);

  const { sendMessage, loading, sessionId, clearSession } = useSSE(setMessages);

  const handleNewChat = () => {
    clearSession();
    setMessages([]);
  };

  const handleSend = (text, files) => {
    sendMessage(text, files);
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body {
          font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif;
          background: #090d1a; color: #e2e8f0;
        }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", height: "100vh",
        background: `
          radial-gradient(ellipse 55% 35% at 10% 0%, rgba(99,102,241,0.12) 0%, transparent 65%),
          radial-gradient(ellipse 40% 30% at 90% 100%, rgba(139,92,246,0.07) 0%, transparent 60%),
          #090d1a
        `,
      }}>

        {/* 顶栏 */}
        <header style={{
          display: "flex", alignItems: "center", padding: "11px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(9,13,26,0.8)", backdropFilter: "blur(14px)",
          position: "sticky", top: 0, zIndex: 20, flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", marginRight: "10px",
            boxShadow: "0 0 12px rgba(99,102,241,0.35)",
          }}>✦</div>

          <span style={{ fontWeight: 600, fontSize: "14.5px", color: "#e2e8f0" }}>
            AI Chat
          </span>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Session ID 徽章 */}
            {sessionId && (
              <span style={{
                fontSize: "10.5px", color: "#2d3748",
                fontFamily: "monospace", letterSpacing: "0.3px",
              }}>
                #{sessionId.slice(0, 8)}
              </span>
            )}

            {/* 新对话按钮 */}
            <button
              onClick={handleNewChat}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "5px 12px",
                color: "#64748b", fontSize: "12.5px", cursor: "pointer",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(99,102,241,0.1)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
                e.currentTarget.style.color = "#a5b4fc";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#64748b";
              }}
            >
              <PlusIcon /> 新对话
            </button>
          </div>
        </header>

        {/* 主对话区 */}
        <ChatWindow
          messages={messages}
          loading={loading}
          onSend={handleSend}
        />
      </div>
    </>
  );
}
