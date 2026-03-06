"""
backend/agent.py — agno Agent 定义 + 流式事件生成器
"""

import json
import os
import asyncio
import re
from pathlib import Path
from typing import AsyncGenerator
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.deepseek import DeepSeek
from agno.compression.manager import CompressionManager
from agno.db.sqlite.sqlite import SqliteDb

from agno.agent import (
    RunContentEvent,
    ToolCallStartedEvent,
    ToolCallCompletedEvent,
)
import tools

load_dotenv()

# ══════════════════════════════════════════════════════════
# Agent
# ══════════════════════════════════════════════════════════

def _make_agent() -> Agent:
    agent_tools = [tools.read_skill, tools.create_script, tools.run_script, tools.read_uploaded_file]

    try:
        from agno.skills import Skills, LocalSkills
        extra = {"skills": Skills(loaders=[LocalSkills(str(tools.SKILLS_DIR))])}
    except ImportError:
        extra = {}

    return Agent(
        name="Assistant",
        model=DeepSeek(
            id=os.getenv("AGENT_MODEL", "deepseek-chat"),
            api_key=os.getenv("DS_API_KEY"),
            base_url=os.getenv("DS_API_BASE"),
            max_tokens=8192,
        ),
        db=SqliteDb(
            db_file=str(Path(__file__).parent / "agent_storage.db"),
            session_table="agent_sessions",
        ),
     
        add_history_to_context=True,
        num_history_runs=5,
        compress_tool_results=True,
        compression_manager=CompressionManager(
            compress_token_limit=6000,
            compress_tool_results_limit=2,
        ),
        tools=agent_tools,
        instructions=[
            "你是一个能生成文件的 AI 助手。对生成文件请求必须极简输出，禁止寒暄、复述、计划说明、逻辑说明。",
            "规则：",
            "1. 一旦确定要生成文件，首条回复必须直接以 Markdown 代码块开头（脚本全文）。",
            "2. 输出代码块后，立刻调用 create_script(filename, language)。",
            "3. create_script 只允许 filename/language 两个参数，严禁传 code 参数。",
            "4. create_script 会自动读取你刚输出的代码块，再立刻调用 run_script。",
            "",
            "  list_skills()                             → 查看可用 skill",
            "  read_skill(skill_name)                    → 读取 skill 文档",
            "  create_script(filename, language)         → 创建脚本（自动读取刚输出代码块）",
            "  run_script(filename, output_ext)          → 沙箱执行脚本",
            "  read_uploaded_file(filename)              → 读取上传文件",
            "",
            "## 生成文件工作流：",
            "  1. read_skill()",
            "  2. create_script(filename, language)",
            "  3. run_script()",
            "  4. 告知用户文件已生成",
            "",
            "## 脚本规则（严格遵守）：",
            "  - 输出文件必须写入 ./outputs/ 目录",
        ],
        markdown=True,
        **extra,
        
    )


agent = _make_agent()


# ══════════════════════════════════════════════════════════
# 流式事件生成器
# ══════════════════════════════════════════════════════════

async def run_agent_stream(
    message: str,
    history: list[dict],
    session_id: str | None = None,
) -> AsyncGenerator[tuple[str, any], None]:
    """
    异步生成器，产出 (event_type, payload)：
      ("text",  str)   — 文字 delta
      ("step",  dict)  — 工具调用步骤 {tool, args, status, result?}
      ("file",  dict)  — 生成的文件 {name, url, size}
      ("error", str)   — 错误信息
    """
    loop   = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()
    skill_setup_commands: list[str] = []

    def _run_sync():
        nonlocal skill_setup_commands
        
        # Reset globals in tools module
        tools._active_setup_commands = []
        tools._stream_script_cache = {"code": "", "language": "javascript"}
        
        skill_setup_commands = []
        stream_markdown = ""
        try:
            run_kwargs = {"stream": True, "stream_events": True}
            
            if session_id:
                # 启用持久化记忆时，传入 session_id，agno 会自动加载历史。
                # 此时不应再传入 history（否则会重复），或者 history 仅包含最近一次消息？
                # 这里假设如果使用了 session_id，就完全依赖 DB 历史。
                # 如果 history 包含本次用户消息，agno 可能会处理。
                # 但根据 safe approach，如果指定 session_id，则让 agno 管理上下文。
                run_kwargs["session_id"] = session_id
                # 兼容性处理：如果前端传了 history 但 DB 里没数据，可能需要初始化？
                # 目前策略：有 session_id 就用 session_id，忽略 history 参数中的旧消息。
                pass
            elif history:
                # 无 session_id 时，使用前端传入的历史（无持久化）
                run_kwargs["messages"] = history

            for chunk in agent.run(message, **run_kwargs):
                # ── 工具调用开始 ──────────────────────────
                if isinstance(chunk, ToolCallStartedEvent):
                    tc = chunk.tool
                    print(f"工具调用开始：{tc.tool_name}({tc.tool_args})")

                    payload = {
                        "id":     getattr(tc, "tool_call_id", ""),
                        "tool":   tc.tool_name,
                        "args":   tc.tool_args or {},
                        "status": "running",
                    }
                    if not tc.tool_name.startswith("create_"):
                        loop.call_soon_threadsafe(queue.put_nowait, ("step", payload))

                    if tc.tool_name == "run_script" and skill_setup_commands:
                        # 在执行脚本前，先展示并执行来自 skill 的安装命令
                        install_payload = {
                            "id": "skill-install",
                            "tool": "install_skill_deps",
                            "status": "running",
                            "cmd": "\n".join(skill_setup_commands),
                            "args": {"source": "skill"},
                        }
                        loop.call_soon_threadsafe(queue.put_nowait, ("step", install_payload))


                # ── 工具调用完成 ──────────────────────────
                elif isinstance(chunk, ToolCallCompletedEvent):
                    tc     = chunk.tool
                    result = str(tc.result or "")
                    args   = tc.tool_args or {}

                    payload = {
                        "id":     getattr(tc, "tool_call_id", ""),
                        "tool":   tc.tool_name,
                        "args":   args,
                        "status": "done",
                    }

                    if tc.tool_name == "read_skill":
                        # 把读到的文档内容附上
                        payload["content"] = result
                        skill_setup_commands = tools.extract_install_commands(result)
                        payload["setup_commands"] = skill_setup_commands
                        if skill_setup_commands:
                            loop.call_soon_threadsafe(queue.put_nowait, (
                                "step",
                                {
                                    "id": "skill-install",
                                    "tool": "install_skill_deps",
                                    "status": "pending",
                                    "cmd": "\n".join(skill_setup_commands),
                                    "args": {"source": "skill"},
                                }
                            ))
                    elif tc.tool_name == "run_script":
                        run_meta = {}
                        if result.startswith("SUCCESS_JSON:"):
                            run_meta = json.loads(result.split("SUCCESS_JSON:", 1)[1])
                        elif result.startswith("FAILED_JSON:"):
                            run_meta = json.loads(result.split("FAILED_JSON:", 1)[1])

                        payload["cmd"] = run_meta.get("run_cmd", "")
                        payload["output"] = run_meta.get("run_output", result)

                        setup_cmds = run_meta.get("setup_commands", [])
                        if setup_cmds:
                            loop.call_soon_threadsafe(queue.put_nowait, (
                                "step",
                                {
                                    "id": "skill-install",
                                    "tool": "install_skill_deps",
                                    "status": "done",
                                    "cmd": "\n".join(setup_cmds),
                                    "output": run_meta.get("setup_output", "Done"),
                                    "args": {"source": "skill"},
                                }
                            ))

                        out_file = run_meta.get("file", "")
                        if out_file:
                            fpath = Path(out_file)
                            if fpath.exists():
                                loop.call_soon_threadsafe(queue.put_nowait, (
                                    "file", {
                                        "name": fpath.name,
                                        "url":  f"/files/{fpath.name}",
                                        "size": fpath.stat().st_size,
                                    }
                                ))

                    loop.call_soon_threadsafe(queue.put_nowait, ("step", payload))

                # ── 文字内容 ──────────────────────────────
                elif isinstance(chunk, RunContentEvent):
                    delta = chunk.content or ""
                    if delta:
                        stream_markdown += delta
                        latest_code, latest_lang = tools.extract_latest_code_block(stream_markdown)
                        if latest_code.strip():
                            tools._stream_script_cache["code"] = latest_code
                            tools._stream_script_cache["language"] = latest_lang or "javascript"
                        loop.call_soon_threadsafe(queue.put_nowait, ("text", delta))

        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    loop.run_in_executor(None, _run_sync)

    while True:
        item = await queue.get()
        if item is None:
            break
        yield item
