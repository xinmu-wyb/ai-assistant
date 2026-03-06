import { useState, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
let _id = 0;
const uid = () => ++_id;

function extByLang(lang = "") {
  const map = {
    javascript: "js",
    js: "js",
    typescript: "ts",
    ts: "ts",
    python: "py",
    py: "py",
    bash: "sh",
    sh: "sh",
    shell: "sh",
    json: "json",
    html: "html",
    css: "css",
    markdown: "md",
    md: "md",
  };
  return map[lang.toLowerCase()] || "txt";
}

function parseMarkdownCodeBlocks(markdown = "") {
  const lines = markdown.split("\n");
  const blocks = [];
  let inBlock = false;
  let lang = "";
  let code = [];

  for (const line of lines) {
    if (!inBlock && line.startsWith("```")) {
      const info = line.slice(3).trim();
      lang = (info.split(/\s+/)[0] || "").toLowerCase();
      inBlock = true;
      code = [];
      continue;
    }

    if (inBlock && line.startsWith("```")) {
      blocks.push({ language: lang || "text", code: code.join("\n"), closed: true });
      inBlock = false;
      lang = "";
      code = [];
      continue;
    }

    if (inBlock) code.push(line);
  }

  if (inBlock) {
    blocks.push({ language: lang || "text", code: code.join("\n"), closed: false });
  }

  return blocks;
}

export function useSSE(setMessages) {
  const [loading,   setLoading]   = useState(false);
  const [paused,    setPaused]    = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [codeFiles, setCodeFiles] = useState([]);
  const sessionRef = useRef(null);

  const pauseSession = useCallback(async () => {
    // 优先使用 sessionRef.current，因为它是实时更新的
    const sid = sessionRef.current || sessionId;
    if (sid) {
      console.log(`Pausing session: ${sid}`);
      await fetch(`${API}/sessions/${sid}/pause`, { method: "POST" });
      setPaused(true);
    } else {
      console.warn("No session ID available to pause");
    }
  }, [sessionId]);

  const resumeSession = useCallback(async () => {
    const sid = sessionRef.current || sessionId;
    if (sid) {
      console.log(`Resuming session: ${sid}`);
      await fetch(`${API}/sessions/${sid}/resume`, { method: "POST" });
      setPaused(false);
    } else {
      console.warn("No session ID available to resume");
    }
  }, [sessionId]);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return (await (await fetch(`${API}/upload`, { method: "POST", body: fd })).json()).filename;
  };

  const sendMessage = useCallback(async (text, attachedFiles = []) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    const uploaded = [];
    for (const f of attachedFiles) { try { uploaded.push(await uploadFile(f)); } catch {} }

    const fullText = uploaded.length ? `${text}\n\n[已上传文件：${uploaded.join(", ")}]` : text;

    setMessages(prev => [...prev, { id: uid(), role: "user", content: text, attachments: uploaded }]);

    const asstId = uid();
    setMessages(prev => [...prev, {
      id: asstId, role: "assistant", content: "", steps: [], files: [], streaming: true,
    }]);

    const update = (fn) => setMessages(prev => prev.map(m => m.id === asstId ? { ...m, ...fn(m) } : m));

    // step upsert：同一工具 running → done 原地合并
    const stepKey = (s) => {
      if (s?.id) return `id:${s.id}`;
      if (s?.tool === "create_script") return "tool:create_script";
      return `${s?.tool}:${JSON.stringify(s?.args || {})}`;
    };

    const upsertStep = (step) => update(m => {
      const key   = stepKey(step);
      const steps = [...(m.steps || [])];
      const idx   = steps.findIndex(s => stepKey(s) === key);
      if (idx >= 0) steps[idx] = { ...steps[idx], ...step };
      else          steps.push(step);
      return { steps };
    });

    let streamedContent = "";
    const syncStreamCodeToCreateStep = (content) => {
      const blocks = parseMarkdownCodeBlocks(content);
      if (!blocks.length) return;
      const last = blocks[blocks.length - 1];
      if (!last?.code) return;

      update((m) => {
        const steps = [...(m.steps || [])];
        const idx = steps.findIndex((s) => s.tool === "create_script");
        const prev = idx >= 0 ? steps[idx] : { tool: "create_script", status: "running", args: {} };
        const filename =
          prev.filename ||
          prev.args?.filename ||
          `streaming_script.${extByLang(last.language)}`;

        const next = {
          ...prev,
          filename,
          language: last.language,
          code: last.code,
        };

        if (idx >= 0) steps[idx] = next;
        else steps.push(next);
        return { steps };
      });
    };

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullText, session_id: sessionRef.current }),
      });

      const sid = res.headers.get("X-Session-Id");
      if (sid && !sessionRef.current) { sessionRef.current = sid; setSessionId(sid); }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const eMatch = part.match(/^event:\s*(\w+)/m);
          const dMatch = part.match(/^data:\s*(.+)$/m);
          if (!eMatch || !dMatch) continue;
          const event = eMatch[1];
          let data;
          try { data = JSON.parse(dMatch[1]); } catch { data = { delta: dMatch[1] }; }

          switch (event) {
            case "text":
              streamedContent += (data.delta ?? "");
              update(() => ({ content: streamedContent }));
              syncStreamCodeToCreateStep(streamedContent);
              break;
            case "step":
              upsertStep(data);
              break;
            case "file":  update(m => ({ files: [...m.files, data] })); break;
            case "done":
              update(() => ({ streaming: false }));
              if (data.session_id) { sessionRef.current = data.session_id; setSessionId(data.session_id); }
              break;
            case "warning":
              update(m => ({ content: m.content + `\n\n⚠️ ${data.message}`, streaming: m.streaming }));
              break;
            case "error":
              update(m => ({ content: m.content + `\n\n⚠️ ${data.message}`, streaming: false }));
              break;
          }
        }
      }
    } catch (err) {
      update(m => ({ content: m.content + `\n\n⚠️ 连接失败：${err.message}`, streaming: false }));
    } finally {
      setLoading(false);
    }
  }, [loading, setMessages]);

  const clearSession = useCallback(() => {
    if (sessionRef.current) fetch(`${API}/sessions/${sessionRef.current}`, { method: "DELETE" }).catch(() => {});
    sessionRef.current = null;
    setSessionId(null);
    setCodeFiles([]);
    setPaused(false);
  }, []);

  return { sendMessage, loading, paused, pauseSession, resumeSession, sessionId, clearSession, codeFiles };
}
