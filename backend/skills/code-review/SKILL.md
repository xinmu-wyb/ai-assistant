---
name: code-review
description: 全面的代码审查助手，检查样式、安全性、性能和最佳实践
license: MIT
metadata:
  version: "1.0.0"
  author: agno-tutorial
  tags: ["python", "code-quality", "linting"]
---

# Code Review Skill

专业的代码审查助手，提供全面的代码质量分析。

## 何时使用

- 用户提交代码需要审查
- 用户询问代码改进建议
- 需要检查代码是否符合最佳实践

## 审查维度

### 1. 代码风格（Style）
- PEP 8 合规性检查
- 命名约定一致性
- 代码格式和缩进

### 2. 安全性（Security）
- SQL 注入风险
- XSS 漏洞
- 敏感信息泄露

### 3. 性能（Performance）
- 算法复杂度
- 不必要的重复计算
- 内存使用优化

### 4. 可维护性（Maintainability）
- 函数长度和复杂度
- 代码重复（DRY 原则）
- 注释和文档

## 审查流程

1. **快速扫描**：识别明显问题
2. **使用脚本**：运行 `check_style.py` 进行自动检查
3. **深入分析**：手动审查逻辑和架构
4. **生成报告**：按优先级列出问题和建议

## 输出格式

```markdown
## 代码审查报告

### ⚠️ 关键问题（Critical）
- [问题描述]
  - 位置：第 X 行
  - 建议：[具体改进方案]
  - 示例：[改进后的代码]

### ⚡ 性能问题（Performance）
- ...

### 📝 样式建议（Style）
- ...

### ✨ 最佳实践（Best Practice）
- ...
