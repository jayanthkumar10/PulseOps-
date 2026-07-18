import re
import json
from typing import Dict, Any
from pydantic import BaseModel
from backend.agents.local_llm import call_local_llm

class TriageOutput(BaseModel):
    category: str
    severity: str
    urgency: str
    priority: str
    sla_limit: int # Hours

class TriageAgent:
    def __init__(self):
        self.categories = ["Database", "Security", "Network", "Application", "Infrastructure"]
        
    def execute(self, title: str, description: str) -> TriageOutput:
        """
        Runs triage classification using local LLM (llama3.2:latest) and falls back to heuristics.
        """
        prompt = f"""
        Triage the following incident title and description:
        Title: {title}
        Description: {description}

        Determine the following properties:
        1. Category: Must be exactly one of: "Database", "Security", "Network", "Application", "Infrastructure".
        2. Severity: Must be exactly one of: "Critical", "High", "Medium", "Low".
        3. Urgency: Must be exactly one of: "Immediate", "High", "Medium", "Low".
        4. Priority: Must be exactly one of: "Critical", "High", "Medium", "Low".

        Return ONLY a JSON object matching this schema:
        {{
            "category": "Database|Security|Network|Application|Infrastructure",
            "severity": "Critical|High|Medium|Low",
            "urgency": "Immediate|High|Medium|Low",
            "priority": "Critical|High|Medium|Low"
        }}
        Do not return markdown format wrappers or explanations. Return only valid JSON.
        """
        
        response = call_local_llm(prompt, json_mode=True)
        if response:
            try:
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    if "json" in cleaned[:10]:
                        cleaned = cleaned.split("json", 1)[1]
                    else:
                        cleaned = cleaned.split("\n", 1)[1]
                    cleaned = cleaned.rsplit("```", 1)[0].strip()
                
                data = json.loads(cleaned)
                priority = data.get("priority", "Medium")
                
                # SLA Duration limits
                sla_limits = {
                    "Critical": 4,
                    "High": 8,
                    "Medium": 24,
                    "Low": 48
                }
                sla_limit = sla_limits.get(priority, 24)
                
                return TriageOutput(
                    category=data.get("category", "Application"),
                    severity=data.get("severity", "Medium"),
                    urgency=data.get("urgency", "Medium"),
                    priority=priority,
                    sla_limit=sla_limit
                )
            except Exception as e:
                print(f"[TriageAgent] LLM parse error, falling back to heuristics: {e}")

        # Fallback to heuristics (the original implementation)
        content = (title + " " + description).lower()
        
        category = "Application"
        if any(w in content for w in ["database", "db", "query", "replica", "index", "sql", "postgres", "redis"]):
          category = "Database"
        elif any(w in content for w in ["access", "unauthorized", "iam", "security", "token", "auth", "attack", "policy", "credential"]):
          category = "Security"
        elif any(w in content for w in ["network", "dns", "vpc", "packet", "gateway", "tls", "handshake", "ping"]):
          category = "Network"
        elif any(w in content for w in ["cpu", "memory", "disk", "node", "pod", "kubernetes", "k8s", "server", "host"]):
          category = "Infrastructure"
          
        severity = "Medium"
        urgency = "Medium"
        
        if any(w in content for w in ["latency", "slow", "timeout", "delay", "load"]):
            urgency = "High"
        if any(w in content for w in ["checkout", "billing", "customer", "payment", "prod", "production"]):
            severity = "High"
            
        if any(w in content for w in ["outage", "down", "crash", "critical", "blocking", "failure"]):
            severity = "Critical"
            urgency = "Immediate"
            
        score = 20
        if severity == "Critical":
            score += 40
        elif severity == "High":
            score += 25
        elif severity == "Medium":
            score += 10
            
        if urgency == "Immediate":
            score += 30
        elif urgency == "High":
            score += 15
        elif urgency == "Medium":
            score += 5
            
        if score >= 75:
            priority = "Critical"
        elif score >= 50:
            priority = "High"
        elif score >= 25:
            priority = "Medium"
        else:
            priority = "Low"
            
        sla_limits = {
            "Critical": 4,
            "High": 8,
            "Medium": 24,
            "Low": 48
        }
        sla_limit = sla_limits.get(priority, 24)
        
        return TriageOutput(
            category=category,
            severity=severity,
            urgency=urgency,
            priority=priority,
            sla_limit=sla_limit
        )
