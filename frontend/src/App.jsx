import { useState, useMemo, useEffect } from "react";
import { ChatWindow } from "./components/ChatWindow.jsx";
import { CodePanel  } from "./components/CodePanel.jsx";
import { useSSE      } from "./hooks/useSSE.js";

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const { sendMessage, loading, paused, pauseSession, resumeSession, sessionId, clearSession, codeFiles } = useSSE(setMessages);
  const [showCodePanel, setShowCodePanel] = useState(false);

  useEffect(() => {
    if (codeFiles.length > 0) setShowCodePanel(true);
  }, [codeFiles.length]);

  const handleNewChat = () => { clearSession(); setMessages([]); setShowCodePanel(false); };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; overflow:hidden; }
        body { font-family:'Segoe UI','PingFang SC',system-ui,sans-serif; background:#090d1a; color:#e2e8f0; }
        button:focus, textarea:focus { outline:none; }
        textarea { resize:none; font-family:inherit; }
        ::-webkit-scrollbar { width:3px; height:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }
      `}</style>

      <div style={{
        display:"flex", flexDirection:"column", height:"100vh",
        background:"radial-gradient(ellipse 55% 35% at 10% 0%, rgba(99,102,241,0.1) 0%, transparent 65%), #090d1a",
      }}>
        {/* 顶栏 */}
        <header style={{
          display:"flex", alignItems:"center", padding:"10px 18px", gap:"10px",
          borderBottom:"1px solid rgba(255,255,255,0.05)",
          background:"rgba(9,13,26,0.85)", backdropFilter:"blur(14px)",
          flexShrink:0, zIndex:20,
        }}>
          <div style={{
            width:"26px", height:"26px", borderRadius:"7px",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"12px", boxShadow:"0 0 10px rgba(99,102,241,0.35)",
          }}>✦</div>
          <span style={{ fontWeight:600, fontSize:"14px" }}>Assistant</span>
          <div style={{ flex:1 }} />
          {sessionId && (
            <span style={{ fontSize:"10.5px", color:"#1e293b", fontFamily:"monospace" }}>
              #{sessionId.slice(0,8)}
            </span>
          )}
          <button onClick={handleNewChat} style={{
            display:"flex", alignItems:"center", gap:"5px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:"8px", padding:"5px 12px", color:"#64748b",
            fontSize:"12px", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit",
          }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(99,102,241,0.1)"; e.currentTarget.style.color="#a5b4fc"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#64748b"; }}
          >
            <PlusIcon /> 新对话
          </button>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <ChatWindow messages={messages} loading={loading}
              paused={paused} onPause={pauseSession} onResume={resumeSession}
              onSend={(text, files) => sendMessage(text, files)} />
          </div>
          {showCodePanel && (
            <div style={{ width: "50%", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
              <CodePanel codeFiles={codeFiles} onClose={() => setShowCodePanel(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
