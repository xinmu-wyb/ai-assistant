"""
sandbox.py — 沙箱执行模块
负责：脚本上传、依赖安装、执行、文件下载

依赖：pip install agent-sandbox

启动沙箱：
  docker run --security-opt seccomp=unconfined --rm -it -p 8080:8080 \
    ghcr.io/agent-infra/sandbox:latest
  # 国内：
  docker run --security-opt seccomp=unconfined --rm -it -p 8080:8080 \
    enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:latest
"""

import base64
import os
import re
import time
from pathlib import Path

SANDBOX_URL = os.getenv("SANDBOX_BASE_URL", "http://localhost:8080")
OUTPUT_DIR  = Path(os.getenv("OUTPUT_DIR", "./outputs"))
_LAST_RUN_META: dict = {}


def get_last_run_meta() -> dict:
    return dict(_LAST_RUN_META)


# ══════════════════════════════════════════════════════════
# 连接
# ══════════════════════════════════════════════════════════

def get_sandbox_client():
    """
    返回已连接的 (client, home_dir)。
    连接失败时抛出 RuntimeError。
    """
    try:
        from agent_sandbox import Sandbox
    except ImportError:
        raise RuntimeError("未安装 agent-sandbox，请执行：pip install agent-sandbox")

    client = Sandbox(base_url=SANDBOX_URL)
    try:
        home_dir = client.sandbox.get_context().home_dir
    except Exception as e:
        raise RuntimeError(
            f"沙箱连接失败：{e}\n"
            "请确认 Docker 已启动：\n"
            "  docker run --security-opt seccomp=unconfined --rm -it -p 8080:8080 \\\n"
            "    ghcr.io/agent-infra/sandbox:latest"
        )
    return client, home_dir


# ══════════════════════════════════════════════════════════
# 预检
# ══════════════════════════════════════════════════════════

def precheck_script(code: str, lang: str) -> list[str]:
    """
    在发送到沙箱前静态检查常见错误，返回警告列表（不阻断执行）。
    """
    warnings = []

    if lang == "javascript":
        # docx: Header/Footer 必须用构造函数，不能是普通对象
        if re.search(r'headers\s*:\s*\{[^}]*default\s*:\s*\{', code):
            warnings.append("⚠️  headers.default 是普通对象，应改为 new Header({...})")
        if re.search(r'footers\s*:\s*\{[^}]*default\s*:\s*\{', code):
            warnings.append("⚠️  footers.default 是普通对象，应改为 new Footer({...})")
        # outputs 目录未创建
        if "outputs" in code and "mkdirSync" not in code and "mkdir" not in code:
            warnings.append("⚠️  脚本可能未创建 outputs 目录，建议加：fs.mkdirSync('./outputs', {recursive:true})")
        # unicode bullet 直接使用
        if "\u2022" in code or '"•"' in code or "'•'" in code:
            warnings.append("⚠️  直接使用了 bullet 字符，应改为 LevelFormat.BULLET")
        # 文件保存成 .txt 而非 .docx
        if ".txt'" in code or '.txt"' in code or ".txt`" in code:
            warnings.append("⚠️  脚本可能把文件保存成了 .txt，应改为 .docx")
        # ShadingType.SOLID
        if "ShadingType.SOLID" in code:
            warnings.append("⚠️  使用了 ShadingType.SOLID，应改为 ShadingType.CLEAR（否则表格背景变黑）")

    elif lang == "python":
        # outputs 目录未创建
        if "outputs" in code and "mkdir" not in code and "makedirs" not in code:
            warnings.append("⚠️  脚本可能未创建 outputs 目录，建议加：os.makedirs('./outputs', exist_ok=True)")

    return warnings


# ══════════════════════════════════════════════════════════
# 执行
# ══════════════════════════════════════════════════════════

def run_script(
    code: str,
    lang: str,
    output_ext: str,
    local_output_dir: Path | None = None,
    setup_commands: list[str] | None = None,
) -> Path | None:
    """
    将脚本上传到沙箱执行，下载产出文件到本地。

    参数：
        code            : 脚本内容
        lang            : "javascript" 或 "python"
        output_ext      : 期望产出文件的扩展名，如 ".docx"、".pptx"
        local_output_dir: 本地保存目录，默认 OUTPUT_DIR

    返回：本地文件路径，失败返回 None。
    """
    global _LAST_RUN_META
    _LAST_RUN_META = {
        "setup_commands": list(setup_commands or []),
        "setup_output": "",
        "run_cmd": "",
        "run_output": "",
    }

    save_dir = local_output_dir or OUTPUT_DIR
    save_dir.mkdir(parents=True, exist_ok=True)

    # 1) 预检
    issues = precheck_script(code, lang)
    for w in issues:
        print(w)

    # 2) 连接沙箱
    print(f"🔌 连接沙箱 {SANDBOX_URL} ...")
    try:
        client, home = get_sandbox_client()
    except RuntimeError as e:
        print(f"❌ {e}")
        return None
    print(f"✅ 沙箱已连接，home: {home}")

    # 每次运行前清空沙箱 outputs，避免误取历史文件
    client.shell.exec_command(command=f"rm -rf {home}/outputs && mkdir -p {home}/outputs")

    # 3) 上传脚本
    suffix = "js" if lang == "javascript" else "py"
    script_name = f"task_{int(time.time())}.{suffix}"
    remote_script = f"{home}/{script_name}"
    client.file.write_file(file=remote_script, content=code)
    print(f"📤 脚本已上传：{remote_script}")

    # 3.1) 执行 skill 提取的安装命令
    setup_logs: list[str] = []
    for cmd in (setup_commands or []):
        install_cmd = f"cd {home} && {cmd}"
        print(f"🧩 执行 skill 安装命令: {install_cmd}")
        setup_result = client.shell.exec_command(command=install_cmd, timeout=120)
        out = getattr(setup_result.data, "output", "").strip()
        setup_logs.append(f"$ {cmd}\n{out or 'Done'}")
    _LAST_RUN_META["setup_output"] = "\n\n".join(setup_logs).strip()

    # 4) 默认依赖安装（兜底）
    if lang == "javascript":
        print("📦 安装 Node 依赖（docx / pptxgenjs）...")
        has_docx = any("docx" in c for c in (setup_commands or []))
        has_pptx = any("pptxgenjs" in c for c in (setup_commands or []))
        if not (has_docx and has_pptx):
            client.shell.exec_command(
                command=f"cd {home} && npm install --prefix . docx pptxgenjs 2>/dev/null",
                timeout=120,
            )
        run_cmd = f"cd {home} && node {script_name}"
    else:
        print("📦 安装 Python 依赖（python-docx / python-pptx）...")
        has_py_docx = any("python-docx" in c for c in (setup_commands or []))
        has_py_pptx = any("python-pptx" in c for c in (setup_commands or []))
        if not (has_py_docx and has_py_pptx):
            client.shell.exec_command(
                command="pip install python-docx python-pptx -q",
                timeout=120,
            )
        run_cmd = f"cd {home} && python {script_name}"
    _LAST_RUN_META["run_cmd"] = run_cmd

    # 5) 执行脚本
    print("🚀 沙箱执行中...")
    result = client.shell.exec_command(command=run_cmd, timeout=120)
    output = getattr(result.data, "output", "").strip()
    _LAST_RUN_META["run_output"] = output or "Done"
    if output:
        print(f"📋 沙箱输出：\n{output}")

    # 6) 查找产出文件
    normalized_ext = output_ext if str(output_ext).startswith(".") else f".{output_ext}"
    find_result = client.shell.exec_command(
        command=(
            f"find {home}/outputs -type f -name '*{normalized_ext}' "
            "-printf '%T@ %p\\n' | sort -rn | head -1 | awk '{print $2}'"
        )
    )
    remote_file = getattr(find_result.data, "output", "").strip()

    if not remote_file:
        print(f"⚠️  未找到 {normalized_ext}，尝试获取 outputs/ 下所有文件...")
        list_result = client.shell.exec_command(
            command=(
                f"find {home}/outputs -type f "
                "-printf '%T@ %p\\n' | sort -rn | head -5 | awk '{print $2}'"
            )
        )
        all_files = getattr(list_result.data, "output", "").strip()
        print(f"outputs/ 内容：{all_files or '（空）'}")
        if not all_files:
            print("❌ outputs/ 目录为空，脚本可能未成功写入文件")
            return None
        candidates = [f.strip() for f in all_files.splitlines() if f.strip()]
        matched = [f for f in candidates if f.endswith(normalized_ext)]
        remote_file = matched[0] if matched else candidates[0]
        print(f"📌 使用文件：{remote_file}")

    # 7) 下载文件
    print(f"📥 下载文件：{remote_file}")
    size_result = client.shell.exec_command(command=f"wc -c < '{remote_file}'")
    file_size = int(getattr(size_result.data, "output", "0").strip() or "0")
    if file_size <= 0:
        print("❌ 文件大小为 0")
        return None

    chunk_size = 200 * 1024
    raw_chunks: list[bytes] = []
    offset = 0
    while offset < file_size:
        chunk_result = client.shell.exec_command(
            command=f"dd if='{remote_file}' bs=1 skip={offset} count={chunk_size} 2>/dev/null | base64 -w 0",
            timeout=60,
        )
        chunk_b64 = getattr(chunk_result.data, "output", "").strip()
        chunk_b64 = re.sub(r"[^A-Za-z0-9+/=]", "", chunk_b64)
        if not chunk_b64:
            break
        pad = len(chunk_b64) % 4
        if pad:
            chunk_b64 += "=" * (4 - pad)
        raw_chunks.append(base64.b64decode(chunk_b64))
        offset += chunk_size

    if not raw_chunks:
        print("❌ 所有块读取失败")
        return None

    local_path = save_dir / Path(remote_file).name
    local_path.write_bytes(b"".join(raw_chunks))
    print(f"✅ 文件已保存：{local_path}（{len(raw_chunks)} 块）")
    return local_path


# ══════════════════════════════════════════════════════════
# 便捷方法
# ══════════════════════════════════════════════════════════

def run_js(code: str, output_ext: str, **kwargs) -> Path | None:
    """执行 JavaScript 脚本"""
    return run_script(code, "javascript", output_ext, **kwargs)


def run_python(code: str, output_ext: str, **kwargs) -> Path | None:
    """执行 Python 脚本"""
    return run_script(code, "python", output_ext, **kwargs)
