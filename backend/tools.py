import json
import re
import os
from pathlib import Path

# ══════════════════════════════════════════════════════════
# Configuration & Globals
# ══════════════════════════════════════════════════════════

SKILLS_DIR = Path(__file__).parent / "skills"
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# 注意：这些是模块级全局变量，在并发场景下可能存在线程安全问题。
# 目前架构假定单次只处理一个相关上下文，或依赖外部锁机制。
_script_store: dict[str, dict] = {}
_active_setup_commands: list[str] = []
_stream_script_cache: dict[str, str] = {"code": "", "language": ""}


# ══════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════

def extract_install_commands(skill_md: str) -> list[str]:
    """从 SKILL.md 中提取依赖安装命令（仅 install/add 类）。"""
    commands: list[str] = []

    def add(cmd: str):
        cmd = cmd.strip()
        if not cmd:
            return
        if cmd not in commands:
            commands.append(cmd)

    # 1) bash 代码块中的安装命令
    for block in re.findall(r"```bash\s*([\s\S]*?)```", skill_md, flags=re.IGNORECASE):
        for line in block.splitlines():
            cmd = line.strip()
            if not cmd or cmd.startswith("#"):
                continue
            if re.search(r"\b(npm|pnpm|yarn|pip|apt-get|apt)\b.*\b(install|add)\b", cmd):
                add(cmd)

    # 2) 行内 Install: `...`
    for inline in re.findall(r"Install:\s*`([^`]+)`", skill_md, flags=re.IGNORECASE):
        if re.search(r"\b(npm|pnpm|yarn|pip|apt-get|apt)\b.*\b(install|add)\b", inline):
            add(inline)

    return commands


def extract_latest_code_block(markdown: str) -> tuple[str, str]:
    """从 markdown 中提取最后一个代码块（支持未闭合流式块）。"""
    closed = list(re.finditer(r"```([a-zA-Z0-9_-]*)\n([\s\S]*?)```", markdown))
    if closed:
        m = closed[-1]
        return (m.group(2) or "", (m.group(1) or "javascript").strip().lower())

    openers = list(re.finditer(r"```([a-zA-Z0-9_-]*)\n", markdown))
    if openers:
        m = openers[-1]
        return (markdown[m.end():], (m.group(1) or "javascript").strip().lower())

    return "", "javascript"


def looks_truncated(text: str) -> bool:
    t = (text or "").rstrip()
    if not t:
        return False
    if t.count("```") % 2 == 1:
        return True
    tail = t.splitlines()[-1].strip()
    if not tail:
        return False
    if re.search(r"[,:=+\-*/([{]$", tail):
        return True
    if re.search(r"\b(const|let|var|return|new|if|for|while|function|class)\s*$", tail):
        return True
    return False


# ══════════════════════════════════════════════════════════
# Tools
# ══════════════════════════════════════════════════════════

def list_skills() -> str:
    """列出所有可用 skill 名称"""
    skills = [
        d.name for d in SKILLS_DIR.iterdir()
        if d.is_dir() and (d / "SKILL.md").exists()
    ]
    return "\n".join(skills) if skills else "暂无可用 skill"


def read_skill(skill_name: str) -> str:
    """读取指定 skill 的 SKILL.md 文档"""
    global _active_setup_commands
    path = SKILLS_DIR / skill_name / "SKILL.md"
    if not path.exists():
        _active_setup_commands = []
        return f"Skill '{skill_name}' 不存在。可用：\n{list_skills()}"
    content = path.read_text(encoding="utf-8")
    _active_setup_commands = extract_install_commands(content)
    return content


def create_script(filename: str, language: str = "javascript", **_: object) -> str:
    """保存模型输出的脚本"""
    code = _stream_script_cache.get("code", "")
    if not code.strip():
        return "FAILED: 未获取到脚本内容，请先输出代码块"
    _script_store[filename] = {"code": code, "language": language}
    return f"Script saved: {filename} ({len(code.splitlines())} lines)"


def run_script(filename: str, output_ext: str) -> str:
    """在沙箱执行之前保存的脚本"""
    entry = _script_store.get(filename)
    if not entry:
        return f"FAILED: 找不到脚本 {filename}，请先调用 create_script"
    import sandbox as sandbox_mod
    result = sandbox_mod.run_script(
        entry["code"],
        entry["language"],
        output_ext,
        local_output_dir=OUTPUT_DIR,
        setup_commands=_active_setup_commands,
    )
    meta_getter = getattr(sandbox_mod, "get_last_run_meta", None)
    meta = meta_getter() if callable(meta_getter) else {}
    payload = {
        "ok": bool(result),
        "file": str(result) if result else "",
        "run_cmd": meta.get("run_cmd", ""),
        "run_output": meta.get("run_output", ""),
        "setup_commands": meta.get("setup_commands", []),
        "setup_output": meta.get("setup_output", ""),
    }
    prefix = "SUCCESS_JSON:" if result else "FAILED_JSON:"
    return prefix + json.dumps(payload, ensure_ascii=False)


def read_uploaded_file(filename: str) -> str:
    """读取用户上传的文件内容"""
    upload_dir = Path(__file__).parent / "uploads"
    candidates = list(upload_dir.glob(f"*{filename}*"))
    if not candidates:
        return f"找不到上传文件：{filename}"
    try:
        return sorted(candidates)[-1].read_text(encoding="utf-8")
    except Exception:
        return "文件不是文本格式"
