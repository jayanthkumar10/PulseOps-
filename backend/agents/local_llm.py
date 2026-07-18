import urllib.request
import json
from typing import Optional, Dict, Any

def call_local_llm(prompt: str, system: Optional[str] = None, model: str = "llama3.2:latest", json_mode: bool = False) -> Optional[str]:
    """
    Calls the local Ollama LLM endpoint to generate a response.
    """
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1
        }
    }
    if system:
        payload["system"] = system
    if json_mode:
        payload["format"] = "json"
        
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        # Timeout of 12 seconds to prevent blocking
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("response", "").strip()
    except Exception as e:
        print(f"[Ollama Call Failed] {e}")
        return None
