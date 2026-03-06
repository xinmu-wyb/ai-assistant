import React, { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{
      background: "transparent", border: "none", cursor: "pointer",
      color: copied ? "#34d399" : "#94a3b8", fontSize: "12px",
      padding: "4px", borderRadius: "4px",
      transition: "all 0.2s",
    }}>
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export function XMarkdown({ content, hideFencedCode = false }) {
  return (
    <div className="markdown-body" style={{ fontSize: "14px" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            const codeText = String(children).replace(/\n$/, "");

            if (!inline && hideFencedCode) {
              return null;
            }
            
            if (!inline && match) {
              return (
                <div style={{
                  background: "#1e1e1e", borderRadius: "6px",
                  margin: "12px 0", border: "1px solid rgba(255,255,255,0.1)",
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 12px", background: "rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    fontSize: "12px", color: "#a1a1aa"
                  }}>
                    <span>{lang}</span>
                    <CopyButton text={codeText} />
                  </div>
                  <pre style={{ margin: 0, padding: "12px", overflowX: "auto" }}>
                    <code className={className} {...props} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }
            return (
              <code className={className} {...props} style={{
                background: "rgba(255,255,255,0.1)", padding: "2px 5px",
                borderRadius: "4px", fontSize: "0.9em", fontFamily: "monospace"
              }}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul style={{ paddingLeft: "20px", marginBottom: "10px" }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: "20px", marginBottom: "10px" }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", textDecoration: "none" }}>{children}</a>,
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: "3px solid #6366f1", paddingLeft: "12px",
              margin: "10px 0", color: "#a1a1aa", fontStyle: "italic"
            }}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
             <div style={{ overflowX: "auto", margin: "12px 0" }}>
               <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>{children}</table>
             </div>
          ),
          th: ({ children }) => (
            <th style={{
              border: "1px solid rgba(255,255,255,0.2)", padding: "8px",
              background: "rgba(255,255,255,0.1)", textAlign: "left"
            }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{
              border: "1px solid rgba(255,255,255,0.1)", padding: "8px"
            }}>{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
