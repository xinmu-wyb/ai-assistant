/**
 * CodePanel.jsx — 右侧脚本查看面板
 * 实时展示 agent 生成的脚本，支持：语法高亮、行号、复制、文件标签切换
 */

import { useState, useEffect, useRef } from "react";

// ── 行号渲染 ─────────────────────────────────────────────
function CodeLines({ code, language }) {
  const lines = (code || "").split("\n");
  return (
    <div style={{ display: "flex", minWidth: 0 }}>
      {/* 行号 */}
      <div style={{
        flexShrink: 0, width: "42px", textAlign: "right",
        paddingRight: "16px", paddingTop: "16px",
        color: "rgba(255,255,255,0.15)",
        fontSize: "12px", lineHeight: "1.65",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        userSelect: "none",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}>
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* 代码 */}
      <pre
        style={{
          flex: 1, overflow: "auto",
          padding: "16px 16px 16px 20px",
          fontSize: "12.5px", lineHeight: "1.65",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          whiteSpace: "pre",
          color: "#e2e8f0",
          margin: 0,
        }}
      >
        {code || ""}
      </pre>
    </div>
  );
}

// ── 复制按钮 ─────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{
      background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
      border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "6px", padding: "4px 10px",
      color: copied ? "#34d399" : "#94a3b8",
      fontSize: "11.5px", cursor: "pointer",
      transition: "all 0.2s", fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: "5px",
    }}>
      {copied
        ? <><span>✓</span> 已复制</>
        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg> 复制</>
      }
    </button>
  );
}

// ── 文件标签 ─────────────────────────────────────────────
function FileTab({ file, active, onClick }) {
  const langIcon = { javascript: "JS", python: "PY" }[file.language] || "?";
  const langColor = { javascript: "#f0db4f", python: "#4b8bbe" }[file.language] || "#94a3b8";
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "8px 14px",
      background: active ? "rgba(255,255,255,0.05)" : "transparent",
      border: "none",
      borderBottom: `2px solid ${active ? "#6366f1" : "transparent"}`,
      borderRight: "1px solid rgba(255,255,255,0.04)",
      color: active ? "#e2e8f0" : "#4b5563",
      fontSize: "12.5px", cursor: "pointer",
      transition: "all 0.15s", fontFamily: "inherit",
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: "9px", fontWeight: 800, color: langColor,
        background: langColor + "20", border: `1px solid ${langColor}40`,
        borderRadius: "3px", padding: "1px 5px", letterSpacing: "0.5px",
      }}>{langIcon}</span>
      <span>{file.filename}</span>
    </button>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export function CodePanel({ codeFiles, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const codeRef = useRef(null);

  // 新文件进来时自动切换到最新
  useEffect(() => {
    if (codeFiles.length > 0) {
      setActiveIdx(codeFiles.length - 1);
    }
  }, [codeFiles.length]);

  // 代码更新时自动滚到底部
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [codeFiles[activeIdx]?.code]);

  if (codeFiles.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: "12px",
        color: "#1e293b", fontSize: "13px", textAlign: "center", padding: "40px",
      }}>
        <div style={{ fontSize: "32px", opacity: 0.3 }}>⌨</div>
        <div>生成文件时，脚本将在此展示</div>
      </div>
    );
  }

  const active = codeFiles[activeIdx];

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#0d1117",
    }}>
      {/* 顶栏 */}
      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0a0e15", flexShrink: 0,
      }}>
        {/* 文件标签 */}
        <div style={{
          display: "flex", overflowX: "auto", flex: 1,
          scrollbarWidth: "none",
        }}>
          {codeFiles.map((f, i) => (
            <FileTab key={i} file={f} active={i === activeIdx} onClick={() => setActiveIdx(i)} />
          ))}
        </div>

        {/* 右侧操作 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", flexShrink: 0 }}>
          {active && <CopyButton text={active.code} />}
          <button onClick={onClose} title="关闭面板" style={{
            background: "none", border: "none", color: "#374151",
            cursor: "pointer", padding: "4px", fontSize: "16px",
            display: "flex", alignItems: "center", transition: "color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
            onMouseLeave={e => e.currentTarget.style.color = "#374151"}
          >×</button>
        </div>
      </div>

      {/* 代码内容 */}
      <div ref={codeRef} style={{
        flex: 1, overflowY: "auto", overflowX: "auto",
      }}>
        {active && <CodeLines code={active.code} language={active.language} />}
      </div>

      {/* 行数统计 */}
      {active && (
        <div style={{
          padding: "5px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: "11px", color: "#1e293b", display: "flex", gap: "16px",
          background: "#0a0e15", flexShrink: 0,
        }}>
          <span>{active.language}</span>
          <span>{active.code.split("\n").length} 行</span>
          <span>{active.filename}</span>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  );
}
