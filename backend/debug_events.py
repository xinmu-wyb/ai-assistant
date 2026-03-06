
import os
import asyncio
from dotenv import load_dotenv
from agent import agent
from agno.agent import ToolCallStartedEvent, ToolCallCompletedEvent, RunContentEvent, RunCompletedEvent, RunContinuedEvent

load_dotenv()

async def test_agent_events():
    print("Starting agent event test...")
    # 强制触发 create_script 工具调用
    message = "请帮我生成一个 python 脚本 hello.py，内容是打印 'Hello World'，使用 create_script 工具"
    
    try:
        run_kwargs = {"stream": True, "stream_events": True}
        
        # 打印所有产生出来的 chunk 类型和内容
        for chunk in agent.run(message, **run_kwargs):
            t = type(chunk).__name__
            print(f"Event: {t}")
            
            if hasattr(chunk, "content") and chunk.content:
                print(f"  Content: {chunk.content[:50]}...")
            
            if hasattr(chunk, "tool") and chunk.tool:
                print(f"  Tool: {chunk.tool.tool_name}")
                if hasattr(chunk.tool, "tool_args"):
                    print(f"  Args: {chunk.tool.tool_args}")
            
            # 检查是否有未知的 delta 属性
            if hasattr(chunk, "delta"):
                print(f"  Delta: {chunk.delta}")

            # 检查新事件类型
            if isinstance(chunk, RunCompletedEvent):
                print("  RunCompletedEvent received!")
            if isinstance(chunk, RunContinuedEvent):
                print("  RunContinuedEvent received!")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_agent_events())
