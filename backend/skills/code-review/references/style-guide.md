# Python 代码审查样式指南

## 命名约定

### 变量和函数：snake_case
```python
# ✅ 正确
user_count = 10
def calculate_total():
    pass

# ❌ 错误
userCount = 10
def CalculateTotal():
    pass
```

### 类：PascalCase
```python
# ✅ 正确
class UserManager:
    pass

# ❌ 错误
class user_manager:
    pass
```

### 常量：UPPER_SNAKE_CASE
```python
# ✅ 正确
MAX_SIZE = 100

# ❌ 错误
maxSize = 100
```

## 代码布局

### 行长度
- 最大 100 字符
- 在逻辑断点处换行

### 空行
- 顶层定义之间：2 个空行
- 方法之间：1 个空行

### 导入顺序
```python
# 1. 标准库
import os
import sys

# 2. 第三方库
import numpy as np

# 3. 本地模块
from myapp import models
```

## 最佳实践

### 异常处理
```python
# ✅ 正确：指定异常类型
try:
    value = int(user_input)
except ValueError:
    print("Invalid input")

# ❌ 错误：裸 except
try:
    value = int(user_input)
except:
    print("Error")
```

### 使用 logging 而非 print
```python
# ✅ 正确
import logging
logging.info("Processing started")

# ❌ 错误（生产代码中）
print("Processing started")
```

### 文档字符串
```python
def calculate_discount(price: float, rate: float) -> float:
    """计算折扣后的价格。
    
    Args:
        price: 原始价格
        rate: 折扣率（0-1）
        
    Returns:
        折扣后的价格
        
    Raises:
        ValueError: 如果 rate 不在有效范围内
    """
    if not 0 <= rate <= 1:
        raise ValueError("Rate must be between 0 and 1")
    return price * (1 - rate)
```
