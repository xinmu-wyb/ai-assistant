"""
backend/main.py — FastAPI 后端
功能：流式对话(SSE)、多轮对话 session、文件上传、文件下载
"""

import json
import uuid
import time
import asyncio
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from agent import agent, run_agent_stream

app = FastAPI(title="AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path(__file__).parent / "outputs"
UPLOAD_DIR = Path(__file__).parent / "uploads"
OUTPUT_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

# ── 多轮对话 session 存储（内存，生产环境换 Redis）──────
# { session_id: [ {role, content}, ... ] }
sessions: dict[str, list[dict]] = {}

MAX_HISTORY = 20   # 每个 session 最多保留的消息轮数


# ══════════════════════════════════════════════════════════
# 数据模型
# ══════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None   # 为空时自动创建新 session


class SessionInfo(BaseModel):
    session_id: str
    message_count: int


# ══════════════════════════════════════════════════════════
# SSE 工具
# event: text   → 流式文字 delta
# event: step   → 工具调用步骤 {tool, args, status}
# event: file   → 生成文件 {name, url, size}
# event: done   → 结束 {session_id}
# event: error  → 错误 {message}
# ══════════════════════════════════════════════════════════

def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# { session_id: Event }
pause_events: dict[str, asyncio.Event] = {}

@app.post("/sessions/{session_id}/pause")
async def pause_session(session_id: str):
    """暂停 session"""
    if session_id not in pause_events:
        pause_events[session_id] = asyncio.Event()
    pause_events[session_id].clear()
    return {"status": "paused"}

@app.post("/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    """继续 session"""
    if session_id in pause_events:
        pause_events[session_id].set()
    return {"status": "resumed"}

async def check_pause(session_id: str):
    """检查是否暂停"""
    if session_id in pause_events and not pause_events[session_id].is_set():
        await pause_events[session_id].wait()

async def stream_response(
    message: str,
    history: list[dict],
    session_id: str,
) -> AsyncGenerator[str, None]:
    """把 agent 运行过程转成 SSE 事件流"""
    
    # 初始化暂停事件
    if session_id not in pause_events:
        pause_events[session_id] = asyncio.Event()
        pause_events[session_id].set()

    full_text = ""
    new_files: list[dict] = []

    try:
        async for event_type, payload in run_agent_stream(message, history, session_id):
            await check_pause(session_id) # 检查暂停

            if event_type == "text":
                full_text += payload
                yield sse("text", {"delta": payload})

            elif event_type == "step":
                yield sse("step", payload)

            elif event_type == "file":
                new_files.append(payload)
                yield sse("file", payload)

            elif event_type == "error":
                yield sse("error", {"message": payload})

    except Exception as e:
        yield sse("error", {"message": str(e)})
        return

    # 把本轮对话追加到 session 历史
    sessions[session_id].append({"role": "user",      "content": message})
    sessions[session_id].append({"role": "assistant", "content": full_text})

    # 截断超长历史（保留最近 MAX_HISTORY 条）
    if len(sessions[session_id]) > MAX_HISTORY * 2:
        sessions[session_id] = sessions[session_id][-MAX_HISTORY * 2:]

    yield sse("done", {"session_id": session_id, "files": new_files})


# ══════════════════════════════════════════════════════════
# 路由
# ══════════════════════════════════════════════════════════

@app.post("/chat")
async def chat(req: ChatRequest):
    """流式对话（SSE）"""
    # 获取或创建 session
    sid = req.session_id or str(uuid.uuid4())
    if sid not in sessions:
        sessions[sid] = []

    history = sessions[sid]

    return StreamingResponse(
        stream_response(req.message, history, sid),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Session-Id": sid,
        },
    )


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """获取 session 历史消息"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "messages": sessions[session_id]}


@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """清空 session 历史（开启新对话）"""
    sessions.pop(session_id, None)
    return {"ok": True}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传文件供 agent 处理"""
    safe_name = f"{int(time.time())}_{file.filename}"
    dest = UPLOAD_DIR / safe_name
    dest.write_bytes(await file.read())
    return {
        "filename": file.filename,
        "saved_as": safe_name,
        "path": str(dest),
        "url": f"/uploads/{safe_name}",
    }


@app.get("/uploads/{filename}")
async def get_upload(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@app.get("/files/{filename}")
async def download_file(filename: str):
    """下载生成的文件"""
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)


@app.get("/files")
async def list_files():
    """列出所有已生成的文件"""
    files = [
        {
            "name": f.name,
            "url":  f"/files/{f.name}",
            "size": f.stat().st_size,
            "created_at": f.stat().st_mtime,
        }
        for f in sorted(OUTPUT_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)
        if f.is_file()
    ]
    return {"files": files}


@app.get("/health")
async def health():
    return {"status": "ok"}


# ══════════════════════════════════════════════════════════
# 启动
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
