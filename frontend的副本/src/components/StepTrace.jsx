/**
 * StepTrace.jsx — 执行步骤可视化
 * 支持 running → done 状态过渡，可折叠
 */

import { useState } from "react";

const TOOL_META = {
  list_skills:           { label: "查看可用 Skills",  icon: "◈" },
  read_skill:            { label: "读取 Skill 文档",  icon: "◉" },
  run_script_in_sandbox: { label: "沙箱执行脚本",     icon: "⬡" },
  read_uploaded_file:    { label: "读取上传文件",     icon: "◎" },
};

function RunningDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: "3px", height: "3px", borderRadius: "50%",
          background: "#818cf8", display: "inline-block",
          animation: `dotPulse 1.2s ease ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <polyline points="1.5,5 4,7.5 8.5,2.5"
        stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StepRow({ step, index }) {
  const done = step.status === "done";
  const meta = TOOL_META[step.tool] || { label: step.tool, icon: "◇" };

  const argHint =
    step.args?.skill_name   ? `(${step.args.skill_name})` :
    step.args?.language     ? `(${step.args.language})` :
    step.args?.filename     ? `(${step.args.filename})` : "";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "3px 0",
      animation: `stepSlideIn 0.2s ease ${index * 0.05}s both`,
    }}>
      {/* 状态指示器 */}
      <div style={{
        width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)",
        border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`,
        transition: "all 0.3s ease",
      }}>
        {done
          ? <CheckIcon />
          : <span style={{ fontSize: "7px", color: "#818cf8" }}>●</span>
        }
      </div>

      {/* 标签 */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        background: done ? "rgba(16,185,129,0.05)" : "rgba(99,102,241,0.06)",
        border: `1px solid ${done ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)"}`,
        borderRadius: "6px", padding: "3px 9px",
        fontSize: "11.5px",
        color: done ? "#6ee7b7" : "#a5b4fc",
        fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
        transition: "all 0.3s ease",
      }}>
        <span style={{ opacity: 0.6, fontSize: "10px" }}>{meta.icon}</span>
        <span style={{ fontWeight: 500 }}>{meta.label}</span>
        {argHint && <span style={{ opacity: 0.5, fontSize: "10.5px" }}>{argHint}</span>}
        {!done && <RunningDot />}
      </div>
    </div>
  );
}

export function StepTrace({ steps }) {
  const [open, setOpen] = useState(true);
  if (!steps?.length) return null;

  // 合并同 id 的 running/done（用 tool+args 做 key）
  const merged = [];
  const seen   = new Map();
  for (const s of steps) {
    const key = `${s.tool}:${JSON.stringify(s.args)}`;
    if (seen.has(key)) {
      merged[seen.get(key)] = { ...merged[seen.get(key)], ...s };
    } else {
      seen.set(key, merged.length);
      merged.push({ ...s });
    }
  }

  const doneCount    = merged.filter(s => s.status === "done").length;
  const runningCount = merged.length - doneCount;

  return (
    <div style={{ marginBottom: "10px" }}>
      {/* 标头 */}
      <button onClick={() => setOpen(o => !o)} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "6px",
        color: "#374151", fontSize: "11px", padding: "0 0 5px",
        fontFamily: "inherit",
      }}>
        <span style={{
          fontSize: "7px", transition: "transform 0.2s",
          transform: open ? "rotate(90deg)" : "rotate(0)",
          display: "inline-block",
        }}>▶</span>
        <span>执行过程</span>
        <span style={{
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "10px", padding: "1px 7px",
          fontSize: "10px", color: "#818cf8",
        }}>
          {doneCount}/{merged.length}
          {runningCount > 0 && " · 运行中"}
        </span>
      </button>

      {/* 步骤列表 */}
      {open && (
        <div style={{
          borderLeft: "1px dashed rgba(99,102,241,0.2)",
          marginLeft: "6px", paddingLeft: "14px",
          display: "flex", flexDirection: "column", gap: "2px",
        }}>
          {merged.map((s, i) => <StepRow key={i} step={s} index={i} />)}
        </div>
      )}

      <style>{`
        @keyframes stepSlideIn {
          from { opacity:0; transform:translateX(-8px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes dotPulse {
          0%,80%,100% { opacity:0.3; transform:scale(0.8); }
          40%          { opacity:1;   transform:scale(1.2); }
        }
      `}</style>
    </div>
  );
}
