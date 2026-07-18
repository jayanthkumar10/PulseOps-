import re
import json
from typing import Dict, Any
from pydantic import BaseModel
from backend.agents.local_llm import call_local_llm

class EmailParsingOutput(BaseModel):
    title: str
    description: str
    extracted_category: str
    sender: str
    is_alert: bool

class EmailReceiverAgent:
    def execute(self, email_raw_text: str, sender: str = "alerts@pulseops.ai") -> EmailParsingOutput:
        """
        Parses alert logs and support emails using local LLM (llama3.2:latest) with structured JSON output.
        """
        lines = email_raw_text.strip().split("\n")
        parsed_sender = sender
        for line in lines:
            if line.lower().startswith("from:"):
                parsed_sender = line[5:].strip()

        prompt = f"""
        Analyze the following raw email content and extract structured data:
        1. Title: A short descriptive subject line.
        2. Description: The body content summary of the alert or issue.
        3. Category: Must be exactly one of: "Database", "Security", "Network", "Application", "Infrastructure".
        4. is_alert: Boolean indicating if this is an operational system alert or support incident.

        Email raw content:
        {email_raw_text}

        Return ONLY a JSON object matching this schema:
        {{
            "title": "string",
            "description": "string",
            "extracted_category": "Database|Security|Network|Application|Infrastructure",
            "is_alert": true
        }}
        Do not include markdown wrapper, backticks, or any other explanations. Return only valid JSON.
        """
        
        response = call_local_llm(prompt, json_mode=True)
        if response:
            try:
                # Clean up response in case model wrapped it
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    if "json" in cleaned[:10]:
                        cleaned = cleaned.split("json", 1)[1]
                    else:
                        cleaned = cleaned.split("\n", 1)[1]
                    cleaned = cleaned.rsplit("```", 1)[0].strip()
                
                data = json.loads(cleaned)
                return EmailParsingOutput(
                    title=data.get("title", "Telemetry Warning"),
                    description=data.get("description", email_raw_text),
                    extracted_category=data.get("extracted_category", "Application"),
                    sender=parsed_sender,
                    is_alert=data.get("is_alert", True)
                )
            except Exception as e:
                print(f"[EmailReceiverAgent] LLM parse error, falling back to heuristics: {e}")

        # Fallback to heuristics (the original implementation)
        subject = "Unhandled Telemetry Alert"
        body_lines = []
        is_alert = True
        
        for line in lines:
            if line.lower().startswith("subject:"):
                subject = line[8:].strip()
            elif not line.lower().startswith("from:"):
                body_lines.append(line)
                
        description = " ".join(body_lines).strip()
        if not description:
            description = subject

        content_lower = (subject + " " + description).lower()
        category = "Application"
        
        if any(w in content_lower for w in ["database", "db", "latency", "query", "sql"]):
            category = "Database"
        elif any(w in content_lower for w in ["security", "policy", "403", "unauthorized", "login", "access denied"]):
            category = "Security"
        elif any(w in content_lower for w in ["504", "gateway", "dns", "vpc", "network", "packet"]):
            category = "Network"
        elif any(w in content_lower for w in ["cpu", "memory", "node", "pod", "kubernetes", "infra"]):
            category = "Infrastructure"

        return EmailParsingOutput(
            title=subject,
            description=description,
            extracted_category=category,
            sender=parsed_sender,
            is_alert=is_alert
        )
