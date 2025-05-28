import asyncio
import json
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path to import browser_use
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Import browser-use components
from browser_use import Agent, Browser, BrowserConfig
from browser_use.agent.memory import MemoryConfig
from browser_use.agent.views import AgentSettings
from browser_use.browser.context import BrowserContextConfig

# Load environment variables
load_dotenv()

app = FastAPI(title="Browser-Use WebUI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=Path(__file__).parent), name="static")

# Models
class TaskRequest(BaseModel):
    task: str
    model: str
    api_key: str
    headless: bool = True
    disable_security: bool = False
    use_vision: bool = True
    max_steps: int = Field(25, ge=1, le=100)
    max_actions_per_step: int = Field(10, ge=1, le=20)
    viewport_expansion: int = Field(500, ge=-1, le=1000)
    enable_memory: bool = True
    memory_interval: int = Field(10, ge=5, le=50)
    generate_gif: bool = False
    save_conversation: bool = False
    output_path: str = "./output"

class TaskResponse(BaseModel):
    task_id: str
    message: str

class TaskStatusResponse(BaseModel):
    status: str
    current_step: int
    max_steps: int
    result: str = None

# Store active tasks
active_tasks = {}

# Helper function to get LLM based on model name
def get_llm(model_name, api_key):
    if model_name.startswith("gpt"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, api_key=api_key)
    elif model_name.startswith("claude"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model_name=model_name, api_key=api_key)
    elif model_name.startswith("gemini"):
        from langchain_google_genai import ChatGoogleGenerativeAI
        from pydantic import SecretStr
        return ChatGoogleGenerativeAI(model=model_name, api_key=SecretStr(api_key))
    elif model_name.startswith("deepseek"):
        from langchain_openai import ChatOpenAI
        from pydantic import SecretStr
        return ChatOpenAI(base_url='https://api.deepseek.com/v1', model='deepseek-chat', api_key=SecretStr(api_key))
    elif model_name.startswith("qwen"):
        from langchain_ollama import ChatOllama
        return ChatOllama(model=model_name, num_ctx=32000)
    else:
        raise ValueError(f"Unsupported model: {model_name}")

# Routes
@app.get("/")
async def get_root():
    return FileResponse(Path(__file__).parent / "index.html")

@app.post("/api/run-task", response_model=TaskResponse)
async def run_task(request: TaskRequest):
    task_id = f"task_{len(active_tasks) + 1}_{int(asyncio.get_event_loop().time())}"
    
    try:
        # Configure browser
        browser_config = BrowserConfig(
            headless=request.headless,
            disable_security=request.disable_security,
            new_context_config=BrowserContextConfig(
                viewport_expansion=request.viewport_expansion
            )
        )
        
        # Get LLM
        try:
            llm = get_llm(request.model, request.api_key)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error initializing LLM: {str(e)}")
        
        # Configure agent settings
        agent_settings = AgentSettings(
            use_vision=request.use_vision,
            max_actions_per_step=request.max_actions_per_step,
            generate_gif=request.generate_gif,
            save_conversation_path=request.output_path if request.save_conversation else None
        )
        
        # Configure memory if enabled
        memory_config = None
        if request.enable_memory:
            memory_config = MemoryConfig(
                agent_id=task_id,
                memory_interval=request.memory_interval
            )
        
        # Initialize browser and agent
        browser = Browser(config=browser_config)
        
        agent = Agent(
            task=request.task,
            llm=llm,
            browser=browser,
            enable_memory=request.enable_memory,
            memory_config=memory_config,
            **agent_settings.model_dump()
        )
        
        # Store task info
        active_tasks[task_id] = {
            "agent": agent,
            "browser": browser,
            "status": "running",
            "current_step": 0,
            "max_steps": request.max_steps,
            "result": None
        }
        
        # Run agent in background
        asyncio.create_task(run_agent_task(task_id, request.max_steps))
        
        return TaskResponse(task_id=task_id, message="Task started successfully")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting task: {str(e)}")

async def run_agent_task(task_id, max_steps):
    try:
        agent = active_tasks[task_id]["agent"]
        browser = active_tasks[task_id]["browser"]
        
        # Run the agent
        history = await agent.run(max_steps=max_steps)
        
        # Update task status
        active_tasks[task_id]["status"] = "completed"
        active_tasks[task_id]["result"] = history.final_result() or "Task completed without specific result"
        
    except Exception as e:
        active_tasks[task_id]["status"] = "failed"
        active_tasks[task_id]["result"] = f"Error: {str(e)}"
    
    finally:
        # Clean up resources
        try:
            await browser.close()
        except:
            pass

@app.get("/api/task/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_info = active_tasks[task_id]
    
    return TaskStatusResponse(
        status=task_info["status"],
        current_step=task_info["current_step"],
        max_steps=task_info["max_steps"],
        result=task_info["result"]
    )

@app.websocket("/api/task/{task_id}/stream")
async def stream_task_updates(websocket: WebSocket, task_id: str):
    await websocket.accept()
    
    if task_id not in active_tasks:
        await websocket.send_text(json.dumps({"error": "Task not found"}))
        await websocket.close()
        return
    
    try:
        while active_tasks[task_id]["status"] == "running":
            # Get current task info
            task_info = active_tasks[task_id]
            
            # Send update
            await websocket.send_text(json.dumps({
                "status": task_info["status"],
                "current_step": task_info["current_step"],
                "max_steps": task_info["max_steps"]
            }))
            
            # Wait before next update
            await asyncio.sleep(1)
        
        # Send final update
        await websocket.send_text(json.dumps({
            "status": active_tasks[task_id]["status"],
            "current_step": active_tasks[task_id]["current_step"],
            "max_steps": active_tasks[task_id]["max_steps"],
            "result": active_tasks[task_id]["result"]
        }))
        
    except Exception as e:
        await websocket.send_text(json.dumps({"error": str(e)}))
    
    finally:
        await websocket.close()

@app.post("/api/task/{task_id}/stop")
async def stop_task(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if active_tasks[task_id]["status"] == "running":
        try:
            agent = active_tasks[task_id]["agent"]
            agent.stop()
            active_tasks[task_id]["status"] = "stopped"
            return {"message": "Task stopped successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error stopping task: {str(e)}")
    else:
        return {"message": f"Task is already {active_tasks[task_id]['status']}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)