#!/usr/bin/env python3
"""
代码样式检查脚本
检查常见的 Python 代码样式问题
"""
import sys
import json
import re
from typing import List, Dict

def check_style(code: str) -> Dict:
    """执行代码样式检查。
    
    Args:
        code: 要检查的 Python 代码
        
    Returns:
        包含问题分类的检查结果
    """
    issues = {
        "critical": [],
        "style": [],
        "best_practice": []
    }
    
    lines = code.split('\n')
    
    for i, line in enumerate(lines, 1):
        # 检查行长度
        if len(line) > 100:
            issues["style"].append({
                "line": i,
                "message": f"Line exceeds 100 characters ({len(line)} chars)",
                "suggestion": "Break long lines at logical points"
            })
        
        # 检查尾随空格
        if line.endswith(' ') and line.strip():
            issues["style"].append({
                "line": i,
                "message": "Trailing whitespace",
                "suggestion": "Remove trailing spaces"
            })
        
        # 检查制表符
        if '\t' in line:
            issues["style"].append({
                "line": i,
                "message": "Tab character found",
                "suggestion": "Use 4 spaces instead of tabs"
            })
        
        # 检查 print 语句（可能是调试代码）
        if re.search(r'\bprint\s*(', line):
            issues["best_practice"].append({
                "line": i,
                "message": "print() statement found",
                "suggestion": "Consider using logging instead of print for production code"
            })
        
        # 检查裸 except
        if re.search(r'except\s*:', line):
            issues["critical"].append({
                "line": i,
                "message": "Bare except clause",
                "suggestion": "Specify exception types: except ValueError:"
            })
        
        # 检查 TODO 注释
        if 'TODO' in line or 'FIXME' in line:
            issues["best_practice"].append({
                "line": i,
                "message": "TODO/FIXME comment found",
                "suggestion": "Address pending tasks before code review"
            })
    
    # 统计信息
    total = sum(len(v) for v in issues.values())
    
    return {
        "total_issues": total,
        "issues": issues,
        "summary": {
            "critical": len(issues["critical"]),
            "style": len(issues["style"]),
            "best_practice": len(issues["best_practice"])
        }
    }

def main():
    # 从命令行参数或 stdin 读取代码
    if len(sys.argv) > 1:
        code = sys.argv[1]
    else:
        code = sys.stdin.read()
    
    # 执行检查
    result = check_style(code)
    
    # 输出 JSON 格式结果
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
