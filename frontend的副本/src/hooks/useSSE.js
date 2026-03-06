/**
 * useSSE.js — 流式输出 Hook
 * 解析 text / step(running+done) / file / done / error 事件
 */

import { useState, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

let _id = 0;
const uid = () => ++_id;

export function useSSE(setMessages) {
  const [loading,   setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const sessionRef = useRef(null);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    return data.filename;
  };

  const sendMessage = useCallback(async (text, attachedFiles = []) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    // 上传附件
    const uploaded = [];
    for (const f of attachedFiles) {
      try { uploaded.push(await uploadFile(f)); } catch {}
    }

    const fullText = uploaded.length
      ? `${text}\n\n[已上传文件：${uploaded.join(", ")}]`
      : text;

    // 用户气泡
    setMessages(prev => [...prev, {
      id: uid(), role: "user", content: text, attachments: uploaded,
    }]);

    // assistant 占位气泡
    const asstId = uid();
    setMessages(prev => [...prev, {
      id: asstId, role: "assistant",
      content: "", steps: [], files: [], streaming: true,
    }]);

    const update = (fn) =>
      setMessages(prev => prev.map(m => m.id === asstId ? { ...m, ...fn(m) } : m));

    // step 事件：同一工具 running → done 要合并
    const upsertStep = (step) => {
      update(m => {
        const key   = `${step.tool}:${JSON.stringify(step.args)}`;
        const steps = [...(m.steps || [])];
        const idx   = steps.findIndex(
          s => `${s.tool}:${JSON.stringify(s.args)}` === key
        );
        if (idx >= 0) {
          steps[idx] = { ...steps[idx], ...step };   // 更新状态
        } else {
          steps.push(step);                           // 新增
        }
        return { steps };
      });
    };

    try {
      const res = await fetch(`${API}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:    fullText,
          session_id: sessionRef.current,
        }),
      });

      const sid = res.headers.get("X-Session-Id");
      if (sid && !sessionRef.current) {
        sessionRef.current = sid;
        setSessionId(sid);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

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
          let   data;
          try { data = JSON.parse(dMatch[1]); }
          catch { data = { delta: dMatch[1] }; }

          switch (event) {
            case "text":
              update(m => ({ content: m.content + (data.delta ?? "") }));
              break;
            case "step":
              upsertStep(data);
              break;
            case "file":
              update(m => ({ files: [...m.files, data] }));
              break;
            case "done":
              update(() => ({ streaming: false }));
              if (data.session_id) {
                sessionRef.current = data.session_id;
                setSessionId(data.session_id);
              }
              break;
            case "error":
              update(m => ({
                content:   m.content + `\n\n⚠️ ${data.message}`,
                streaming: false,
              }));
              break;
          }
        }
      }
    } catch (err) {
      update(m => ({
        content:   m.content + `\n\n⚠️ 连接失败：${err.message}`,
        streaming: false,
      }));
    } finally {
      setLoading(false);
    }
  }, [loading, setMessages]);

  const clearSession = useCallback(() => {
    if (sessionRef.current) {
      fetch(`${API}/sessions/${sessionRef.current}`, { method: "DELETE" }).catch(() => {});
    }
    sessionRef.current = null;
    setSessionId(null);
  }, []);

  return { sendMessage, loading, sessionId, clearSession };
}
