/**
 * FileCard.jsx — 文件预览 & 下载卡片
 * 支持 docx / pptx / pdf 图标，显示文件大小，点击下载
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EXT_CONFIG = {
  docx: { color: "#2B7CD3", bg: "rgba(43,124,211,0.1)", border: "rgba(43,124,211,0.25)", label: "Word" },
  pptx: { color: "#D24726", bg: "rgba(210,71,38,0.1)",  border: "rgba(210,71,38,0.25)",  label: "PPT"  },
  pdf:  { color: "#E5383B", bg: "rgba(229,56,59,0.1)",  border: "rgba(229,56,59,0.25)",  label: "PDF"  },
  xlsx: { color: "#1D6F42", bg: "rgba(29,111,66,0.1)",  border: "rgba(29,111,66,0.25)",  label: "Excel"},
  txt:  { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",border: "rgba(148,163,184,0.25)",label: "TXT"  },
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

export function FileCard({ file }) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const cfg = EXT_CONFIG[ext] || EXT_CONFIG.txt;
  const url = file.url.startsWith("http") ? file.url : `${API}${file.url}`;

  return (
    <a
      href={url}
      download={file.name}
      style={{ textDecoration: "none", display: "inline-block", marginTop: "10px" }}
    >
      <div
        className="file-card"
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px", padding: "11px 15px",
          cursor: "pointer", transition: "all 0.18s",
          minWidth: "220px", maxWidth: "320px",
        }}
      >
        {/* 文件类型图标 */}
        <div style={{
          width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "11px", fontWeight: 800, color: cfg.color,
          letterSpacing: "0.3px",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {cfg.label}
        </div>

        {/* 文件信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px", fontWeight: 600, color: "#e2e8f0",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {file.name}
          </div>
          <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "3px" }}>
            {formatSize(file.size)}{file.size ? " · " : ""}点击下载
          </div>
        </div>

        {/* 下载图标 */}
        <div style={{ color: "#374151", flexShrink: 0, transition: "color 0.15s" }}>
          <DownloadIcon />
        </div>
      </div>

      <style>{`
        .file-card:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.14) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .file-card:hover > div:last-child {
          color: #94a3b8 !important;
        }
      `}</style>
    </a>
  );
}
