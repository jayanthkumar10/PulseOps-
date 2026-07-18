import json
from typing import Optional, Tuple
from pydantic import BaseModel
from backend.database.store import db, Engineer
from backend.agents.local_llm import call_local_llm

class AllocationOutput(BaseModel):
    assigned_engineer: Optional[str]
    match_score: int
    reason: str

class AllocationAgent:
    def execute(self, category: str) -> AllocationOutput:
        """
        Scores and assigns the best engineer using a local LLM (llama3.2:latest), falling back to heuristics.
        """
        engineers = db.get_engineers()
        active_engineers = [e for e in engineers if e.status in ["Active", "Idle"]]
        
        if not active_engineers:
            return AllocationOutput(
                assigned_engineer=None,
                match_score=0,
                reason="No active or available engineers found in resource pool."
            )
            
        # Format engineers list for the LLM context
        engineers_list = []
        for eng in active_engineers:
            engineers_list.append({
                "name": eng.name,
                "skills": eng.skills,
                "activeTickets": eng.activeTickets,
                "capacity": eng.capacity,
                "reliability": eng.reliability,
                "status": eng.status
            })
            
        prompt = f"""
        Select the best engineer from the list below to assign to a new ticket in the category '{category}'.
        
        Available Engineers:
        {json.dumps(engineers_list, indent=2)}
        
        Select the engineer based on:
        1. Skills overlap (engineer should have '{category}' in their skills list).
        2. Workload/Capacity (activeTickets should be less than capacity).
        3. Historic reliability (higher percentage is better).
        
        Provide a match score (0-100) reflecting how well they fit the role.
        
        Return ONLY a JSON object matching this schema:
        {{
            "assigned_engineer": "Name of the chosen engineer or null if none",
            "match_score": 85,
            "reason": "Detailed reasoning explaining the match."
        }}
        Do not return markdown wrappers or explanations. Return only valid JSON.
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
                assigned = data.get("assigned_engineer")
                if assigned:
                    # Validate the assigned engineer exists
                    eng_names = [e.name.lower() for e in active_engineers]
                    if assigned.lower() in eng_names:
                        matched_eng = next(e for e in active_engineers if e.name.lower() == assigned.lower())
                        return AllocationOutput(
                            assigned_engineer=matched_eng.name,
                            match_score=data.get("match_score", 70),
                            reason=data.get("reason", f"Selected by local LLM for category {category}")
                        )
            except Exception as e:
                print(f"[AllocationAgent] LLM parse error, falling back to heuristics: {e}")

        # Fallback to heuristics
        best_eng: Optional[Engineer] = None
        best_score = -1
        score_details = ""
        
        for eng in active_engineers:
            score = 0
            details = []
            
            # 1. Skill overlap (50 pts)
            if category in eng.skills:
                score += 50
                details.append("Skills match (+50)")
                
            # 2. Capacity headroom (30 pts)
            headroom = max(0, eng.capacity - eng.activeTickets)
            headroom_score = int((headroom / eng.capacity) * 30)
            score += headroom_score
            details.append(f"Headroom capacity ({eng.activeTickets}/{eng.capacity}, +{headroom_score})")
            
            # 3. Performance/reliability (20 pts)
            rel_score = int(eng.reliability * 0.2)
            score += rel_score
            details.append(f"Reliability ({eng.reliability}%, +{rel_score})")
            
            if score > best_score:
                best_score = score
                best_eng = eng
                score_details = ", ".join(details)
                
        if best_eng:
            return AllocationOutput(
                assigned_engineer=best_eng.name,
                match_score=best_score,
                reason=f"Matched {best_eng.name} with score {best_score} based on heuristics: {score_details}."
            )
        else:
            return AllocationOutput(
                assigned_engineer=None,
                match_score=0,
                reason="No active or available engineers found in resource pool."
            )
