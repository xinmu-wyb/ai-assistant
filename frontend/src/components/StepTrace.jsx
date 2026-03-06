/**
 * StepTrace.jsx — 三类步骤各有内嵌展示：
 *   read_skill     → Markdown 文档预览
 *   create_script  → 代码块（行号 + JS 高亮）
 *   run_script     → bash 命令 + Output
 */

import { useState } from "react";

const TOOL_META = {
  list_skills:        { label: "Reading skills",    icon: "📋" },
  read_skill:         { label: "Reading skill",     icon: "📄" },
  install_skill_deps: { label: "Install skill deps",icon: "🖥️"  },
  create_script:      { label: "Create script",     icon: "📝" },
  run_script:         { label: "Run script",        icon: "⚙️"  },
  read_uploaded_file: { label: "Reading file",      icon: "📎" },
};

// ── 复制按钮 ─────────────────────────────────────────────
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text);
      setOk(true); setTimeout(() => setOk(false), 1600);
    }} style={{
      background: "none",
      border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "4px", padding: "2px 9px",
      color: ok ? "#34d399" : "#374151",
      fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.2s", flexShrink: 0,
    }}>
      {ok ? "✓ 已复制" : "复制"}
    </button>
  );
}

// ── 通用内嵌容器 ─────────────────────────────────────────
function InlineBox({ header, children, maxHeight = "300px" }) {
  return (
    <div style={{
      margin: "6px 0 4px 0",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "8px", overflow: "hidden",
      background: "#0d1117", fontSize: "12px",
      animation: "fadeDown 0.2s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px",
        background: "#0a0e15",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {header}
      </div>
      <div style={{ maxHeight, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

// ── 1. read_skill → SKILL.md 预览 ────────────────────────
function SkillDoc({ content, skillName }) {
  return (
    <InlineBox
      maxHeight="220px"
      header={
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <span style={{ color: "#4b5563", fontFamily: "monospace" }}>
            {skillName}/SKILL.md
          </span>
          <span style={{ color: "#1e293b", marginLeft: "auto" }}>
            {content?.split("\n").length} 行
          </span>
          <CopyBtn text={content || ""} />
        </div>
      }
    >
      <pre style={{
        padding: "10px 14px",
        fontFamily: "monospace", fontSize: "11.5px",
        lineHeight: "1.6", color: "#64748b",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        margin: 0,
      }}>
        {(content || "")}
      </pre>
    </InlineBox>
  );
}

// ── 2. create_script → 代码块 ────────────────────────────
function CodeBlock({ code, language, filename }) {
  const lines = (code || "").split("\n");
  return (
    <InlineBox
      maxHeight="320px"
      header={
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <span style={{
            fontSize: "9px", fontWeight: 800, letterSpacing: "0.5px",
            color: language === "python" ? "#4b8bbe" : "#f0db4f",
            background: language === "python" ? "rgba(75,139,190,0.12)" : "rgba(240,219,79,0.12)",
            border: `1px solid ${language === "python" ? "rgba(75,139,190,0.25)" : "rgba(240,219,79,0.25)"}`,
            borderRadius: "3px", padding: "1px 5px",
          }}>
            {language === "python" ? "PY" : "JS"}
          </span>
          <span style={{ color: "#4b5563", fontFamily: "monospace" }}>{filename}</span>
          <span style={{ color: "#1e293b" }}>{lines.length} 行</span>
          <CopyBtn text={code || ""} />
        </div>
      }
    >
      <div style={{ display: "flex" }}>
        {/* 行号 */}
        <div style={{
          flexShrink: 0, padding: "10px 10px 10px 8px",
          textAlign: "right", minWidth: "38px",
          color: "rgba(255,255,255,0.1)", lineHeight: "1.65",
          fontFamily: "monospace", userSelect: "none",
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}>
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        {/* 代码 */}
        <pre
          style={{
            flex: 1, padding: "10px 14px", lineHeight: "1.65",
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            whiteSpace: "pre", overflowX: "auto", color: "#e2e8f0",
            margin: 0,
          }}
        >
          {code || ""}
        </pre>
      </div>
    </InlineBox>
  );
}

// ── 3. run_script → bash 命令 + Output ───────────────────
function BashOutput({ cmd, output }) {
  const isSuccess = output?.includes("SUCCESS");
  const isFailed  = output?.includes("FAILED");
  const exitCode  = isFailed ? "1" : "0";
  const outText   = isFailed  ? output?.replace("FAILED:", "").trim()
                  : isSuccess ? "Done"
                  : output || "";

  return (
    <InlineBox
      maxHeight="180px"
      header={
        <span style={{ color: "#374151", fontFamily: "monospace", fontSize: "11px" }}>
          bash
        </span>
      }
    >
      {/* 命令行 */}
      <div style={{
        padding: "8px 14px",
        fontFamily: "monospace", color: "#6366f1", fontSize: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {cmd}
      </div>
      {/* Output label */}
      <div style={{ padding: "6px 12px 3px", color: "#374151", fontSize: "11px" }}>
        Output
      </div>
      {/* 输出内容 */}
      <div style={{
        padding: "2px 14px 10px", fontFamily: "monospace", fontSize: "12px",
        color: isFailed ? "#f87171" : "#94a3b8",
        whiteSpace: "pre-wrap",
      }}>
        {outText || <span style={{ color: "#1e293b" }}>（无输出）</span>}
      </div>
      {/* exit code */}
      <div style={{
        padding: "4px 12px 6px", fontSize: "11px",
        color: isFailed ? "#f87171" : "#374151",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        exit code {exitCode}
      </div>
    </InlineBox>
  );
}

// ── 步骤行 ────────────────────────────────────────────────
function StepRow({ step, index }) {
  const done = step.status === "done";
  const meta = TOOL_META[step.tool] || { label: step.tool, icon: "▸" };

  const hasBody =
    (step.tool === "read_skill"    && step.content) ||
    (step.tool === "create_script" && step.code)    ||
    (step.tool === "run_script") ||
    (step.tool === "install_skill_deps");

  const [open, setOpen] = useState(true);

  const badge =
    step.args?.skill_name  ||
    step.args?.filename    ||
    step.args?.skill_name  || "";

  return (
    <div style={{ animation: `stepIn 0.18s ease ${index * 0.05}s both` }}>

      {/* 行头 */}
      <div
        onClick={() => hasBody && setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "5px 0", cursor: hasBody ? "pointer" : "default",
        }}
      >
        {/* 状态圆 */}
        <div style={{
          width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: done ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)",
          border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`,
          transition: "all 0.3s",
        }}>
          {done
            ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#34d399"
                  strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            : <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#6366f1", display: "block",
                animation: "pulse 1.2s ease infinite",
              }}/>
          }
        </div>

        <span style={{ fontSize: "14px" }}>{meta.icon}</span>
        <span style={{ fontSize: "13px", color: done ? "#94a3b8" : "#c7d2fe" }}>
          {meta.label}
        </span>

        {badge && (
          <span style={{
            fontSize: "11px", color: "#374151", fontFamily: "monospace",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "4px", padding: "1px 7px",
          }}>{badge}</span>
        )}

        {!done && (
          <span style={{ display: "inline-flex", gap: "3px", marginLeft: "2px" }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: "3px", height: "3px", borderRadius: "50%",
                background: "#6366f1", display: "inline-block",
                animation: `dot 1s ease ${i*0.15}s infinite`,
              }}/>
            ))}
          </span>
        )}

        {hasBody && (
          <span style={{
            marginLeft: "auto", fontSize: "9px", color: "#374151",
            transition: "transform 0.2s", display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0)",
          }}>▶</span>
        )}
      </div>

      {/* 内嵌内容 */}
      {hasBody && open && (
        step.tool === "read_skill"
          ? <SkillDoc content={step.content} skillName={step.args?.skill_name || ""} />
        : step.tool === "create_script"
          ? <CodeBlock code={step.code} language={step.language} filename={step.filename || step.args?.filename} />
        : <BashOutput cmd={step.cmd} output={step.output} />
      )}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export function StepTrace({ steps }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!steps?.length) return null;

  const merged = [];
  const seen   = new Map();
  const stepKey = (s) => {
    if (s?.id) return `id:${s.id}`;
    if (s?.tool === "create_script") return "tool:create_script";
    return `${s?.tool}:${JSON.stringify(s?.args || {})}`;
  };
  for (const s of steps) {
    const key = stepKey(s);
    if (seen.has(key)) merged[seen.get(key)] = { ...merged[seen.get(key)], ...s };
    else { seen.set(key, merged.length); merged.push({ ...s }); }
  }

  const doneCount = merged.filter(s => s.status === "done").length;
  const running   = doneCount < merged.length;

  const parts = [];
  if (merged.some(s => ["create_script","run_script"].includes(s.tool))) parts.push("created a file");
  if (merged.some(s => s.tool === "read_skill")) parts.push("viewed a file");
  const title = `Ran ${merged.length} command${merged.length !== 1 ? "s" : ""}` +
    (parts.length ? `, ${parts.join(", ")}` : "");

  return (
    <div style={{ marginBottom: "10px", width: "100%" }}>
      <button onClick={() => setCollapsed(c => !c)} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "7px",
        color: "#475569", fontSize: "12.5px", padding: "0 0 8px",
        fontFamily: "inherit", width: "100%",
      }}>
        <span style={{
          display: "inline-block", transition: "transform 0.2s",
          transform: collapsed ? "rotate(0)" : "rotate(90deg)",
          fontSize: "8px",
        }}>▶</span>
        <span>{title}</span>
        {running && (
          <span style={{
            fontSize: "11px", color: "#6366f1",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: "10px", padding: "1px 7px",
          }}>{doneCount}/{merged.length}</span>
        )}
      </button>

      {!collapsed && (
        <div style={{
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          marginLeft: "6px", paddingLeft: "14px",
          display: "flex", flexDirection: "column", gap: "2px",
        }}>
          {merged.map((s, i) => <StepRow key={i} step={s} index={i} />)}
        </div>
      )}

      <style>{`
        @keyframes stepIn  { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeDown{ from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }
        @keyframes dot     { 0%,80%,100%{transform:translateY(0);opacity:0.3} 40%{transform:translateY(-3px);opacity:1} }
      `}</style>
    </div>
  );
}
