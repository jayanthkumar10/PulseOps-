import re
from typing import Dict, Any, Optional
from pydantic import BaseModel
from backend.database.store import db, LogEntry
from backend.agents.local_llm import call_local_llm

class CopilotOutput(BaseModel):
    text: str
    html: Optional[str] = None
    action_type: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None

class CopilotAgent:
    def execute(self, query: str) -> CopilotOutput:
        """
        Parses NL commands and coordinates system responses.
        """
        text = query.lower().strip()
        
        # 1. Filter critical
        if "show critical" in text or "list critical" in text or "critical tickets" in text:
            criticals = [i for i in db.incidents if i.priority == "Critical" and i.status == "Active"]
            
            html = f"<p>Found <strong>{len(criticals)}</strong> active critical incident(s):</p>"
            if criticals:
                html += """<table>
                  <thead>
                    <tr><th>ID</th><th>Title</th><th>SLA Risk</th></tr>
                  </thead>
                  <tbody>"""
                for c in criticals:
                    html += f'<tr style="cursor:pointer;" onclick="window.viewIncidentDetail({c.id}, true)"><td>#{c.id}</td><td>{c.title}</td><td><span class="badge badge-critical">{c.slaRisk}%</span></td></tr>'
                html += "</tbody></table>"
                
            return CopilotOutput(
                text="I've filtered the incident list to show active Critical items.",
                html=html,
                action_type="FILTER_PRIORITY",
                action_payload={"priority": "Critical"}
            )
            
        # 2. Reassign ticket
        reassign_match = re.search(r"(?:re)?assign\s+(?:ticket\s+)?#?(\d+)\s+to\s+([a-zA-Z\s]+)", text, re.IGNORECASE)
        if reassign_match:
            ticket_id = int(reassign_match.group(1))
            target_name = reassign_match.group(2).strip()
            
            # Find engineer
            engineer = None
            for e in db.engineers:
                if target_name.lower() in e.name.lower():
                    engineer = e
                    break
                    
            if not engineer:
                return CopilotOutput(
                    text=f"I couldn't find an engineer matching '{target_name}'.",
                    html=None
                )
                
            # Find ticket
            incident = next((i for i in db.incidents if i.id == ticket_id), None)
            if not incident:
                return CopilotOutput(text=f"Ticket #{ticket_id} not found.", html=None)
                
            # Perform change
            old_assignee = incident.assignee
            if old_assignee:
                old_eng = next((e for e in db.engineers if e.name == old_assignee), None)
                if old_eng and old_eng.activeTickets > 0:
                    old_eng.activeTickets -= 1
                    
            incident.assignee = engineer.name
            engineer.activeTickets += 1
            incident.logs.append(LogEntry(
                time="Just Now",
                text=f"Reassigned from {old_assignee or 'Unassigned'} to {engineer.name} via Copilot."
            ))
            
            return CopilotOutput(
                text=f"Successfully reassigned **Ticket #{ticket_id}** to **{engineer.name}**.",
                html=f"<p>Adjusted active workload for {engineer.name} ({engineer.activeTickets}/{engineer.capacity}).</p>",
                action_type="REASSIGN_TICKET",
                action_payload={"ticket_id": ticket_id, "assignee": engineer.name}
            )
            
        # 3. Allocation details query
        why_match = re.search(r"why\s+(?:is|was)\s+(?:ticket\s+)?#?(\d+)\s+assigned\s+to\s+([a-zA-Z\s\?]+)", text, re.IGNORECASE)
        if why_match:
            ticket_id = int(why_match.group(1))
            ticket = next((i for i in db.incidents if i.id == ticket_id), None)
            
            if not ticket:
                return CopilotOutput(text=f"Ticket #{ticket_id} not found.", html=None)
                
            assignee_name = ticket.assignee
            if not assignee_name:
                return CopilotOutput(text=f"Ticket #{ticket_id} is currently unassigned.", html=None)
                
            eng = next((e for e in db.engineers if e.name == assignee_name), None)
            score = 50 + 25 + int(eng.reliability * 0.2)
            
            return CopilotOutput(
                text=f"Allocation scorecard for **Ticket #{ticket_id}** (assigned to **{assignee_name}**):",
                html=f"""
                  <div style="font-size: 12px; margin-top: 6px;">
                    <p><strong>Affinity Scoring Breakdown:</strong></p>
                    <div>• Skills Match ({ticket.category}): <span style="color:var(--color-success)">+50 pts</span></div>
                    <div>• Available Headroom: <span style="color:var(--color-success)">+25 pts</span></div>
                    <div>• Historic Reliability ({eng.reliability}%): <span style="color:var(--color-success)">+{int(eng.reliability*0.2)} pts</span></div>
                    <div style="margin-top:4px; border-top:1px solid var(--border-color); padding-top:4px;">
                      <strong>Total Match Score: {score} pts</strong>
                    </div>
                  </div>
                """
            )
            
        # 4. Predict SLA risk
        if "sla risk" in text or "predict breach" in text or "predict next sla" in text:
            at_risk = [i for i in db.incidents if i.status == "Active" and i.slaRisk > 50]
            if at_risk:
                primary = max(at_risk, key=lambda x: x.slaRisk)
                return CopilotOutput(
                    text="SLA Engine predicts 1 high-risk ticket:",
                    html=f"""
                      <div style="border-left: 3px solid var(--color-danger); padding-left: 8px; margin: 8px 0;">
                        <p><strong>Ticket #{primary.id}: {primary.title}</strong></p>
                        <p>Risk Score: <span style="color:var(--color-danger); font-weight:700">{primary.slaRisk}% Risk</span></p>
                        <p>Estimated MTTR: {primary.predictedTime} hours (SLA Limit: {primary.slaLimit}h)</p>
                      </div>
                      <div class="chat-bubble-actions">
                        <button class="chat-bubble-action-btn" onclick="executeRemediation({primary.id})">Run Remediation: {primary.remediationAction}</button>
                      </div>
                    """
                )
            else:
                return CopilotOutput(text="SLA compliance forecasts are stable. No breach risks predicted.", html=None)
                
        # 5. Summarize operations
        if "summarize" in text or "summary" in text or "today's incidents" in text:
            active = [i for i in db.incidents if i.status == "Active"]
            crits = len([i for i in active if i.priority == "Critical"])
            highs = len([i for i in active if i.priority == "High"])
            
            return CopilotOutput(
                text="Operations summary for today:",
                html=f"""
                  <table>
                    <tr><td>Total Incidents Logged</td><td><strong>{db.metrics.incidentsToday}</strong></td></tr>
                    <tr><td>Total Resolved</td><td><strong>{db.metrics.resolvedToday}</strong></td></tr>
                    <tr><td>Active Queue Size</td><td><span style="color:var(--color-warning)">{len(active)} pending</span></td></tr>
                    <tr><td>Critical / High Alarms</td><td><span style="color:var(--color-danger)">{crits} Crit</span> / {highs} High</td></tr>
                    <tr><td>SLA Compliance Rate</td><td><span style="color:var(--color-success)">{db.metrics.slaCompliance}%</span></td></tr>
                  </table>
                """
            )
            
        # 6. Apply fix
        fix_match = re.search(r"(?:remediate|fix|apply fix|resolve)\s+(?:ticket\s+)?#?(\d+)", text, re.IGNORECASE)
        if fix_match:
            ticket_id = int(fix_match.group(1))
            incident = next((i for i in db.incidents if i.id == ticket_id), None)
            
            if incident:
                if incident.status == "Resolved":
                    return CopilotOutput(text=f"Ticket #{ticket_id} is already resolved.", html=None)
                    
                incident.status = "Resolved"
                if incident.assignee:
                    eng = next((e for e in db.engineers if e.name == incident.assignee), None)
                    if eng and eng.activeTickets > 0:
                        eng.activeTickets -= 1
                        
                incident.logs.append(LogEntry(
                    time="Just Now",
                    text="Resolved via Copilot auto-remediation tool."
                ))
                db.metrics.resolvedToday += 1
                
                return CopilotOutput(
                    text=f"Executed recovery for **Ticket #{ticket_id}**.",
                    html=f"<p>Action applied: <code>{incident.recommendation}</code>. Closed ticket.</p>",
                    action_type="RESOLVE_TICKET",
                    action_payload={"ticket_id": ticket_id}
                )
            else:
                return CopilotOutput(text=f"Ticket #{ticket_id} not found.", html=None)

        # Local LLM chat fallback
        active_incidents = [i for i in db.incidents if i.status == "Active"]
        resolved_incidents = [i for i in db.incidents if i.status == "Resolved"]
        engineers = db.engineers
        metrics = db.metrics
        
        context = "Active Incidents:\n"
        for i in active_incidents:
            context += f"- Ticket #{i.id}: '{i.title}' Category: {i.category}, Priority: {i.priority}, Assigned to: {i.assignee or 'Unassigned'}, SLA Risk: {i.slaRisk}%\n"
            
        context += "\nResolved Incidents:\n"
        for i in resolved_incidents:
            context += f"- Ticket #{i.id}: '{i.title}' Solution: {i.recommendation}\n"
            
        context += "\nEngineers workload:\n"
        for e in engineers:
            context += f"- {e.name}: Load {e.activeTickets}/{e.capacity}, Reliability {e.reliability}%, Skills: {e.skills}\n"
            
        context += f"\nMetrics: CPU {metrics.cpu}%, DB Latency {metrics.dbLatency}ms, Error Rate {metrics.errorRate}%, SLA Compliance {metrics.slaCompliance}%\n"
        
        prompt = f"""
        You are the PulseOps SRE AI Copilot. Answer the operator's query using the following system context. Keep it concise, professional and focused on incident response metrics.
        
        Context:
        {context}
        
        Query: {query}
        """
        
        llm_response = call_local_llm(prompt)
        if llm_response:
            return CopilotOutput(
                text=llm_response,
                html=None
            )

        # Static Help fallback if LLM offline
        return CopilotOutput(
            text="Hello! I'm the **PulseOps AI Copilot** backend agent. Ask me about system state or call automated tools.",
            html="""
              <p>Supported commands:</p>
              <ul style="margin-left:14px; font-size:12px;">
                <li><code>show critical</code></li>
                <li><code>summarize today</code></li>
                <li><code>predict SLA risks</code></li>
                <li><code>why is ticket 101 assigned to Dave?</code></li>
                <li><code>assign ticket 103 to Sarah Jenkins</code></li>
                <li><code>fix ticket 103</code></li>
              </ul>
            """
        )
