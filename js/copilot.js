// Natural Language Interface & Command Parser for PulseOps AI Copilot
window.PulseCopilot = {
  
  // Parses input text and returns structured response objects
  processMessage: function(inputText) {
    const text = inputText.toLowerCase().trim();
    
    // Command 1: Filter / Show Critical
    if (text.includes("show critical") || text.includes("list critical") || text.includes("critical tickets")) {
      const criticals = PulseState.incidents.filter(i => i.priority === "Critical" && i.status === "Active");
      
      let html = `<p>Found <strong>${criticals.length}</strong> active critical incident(s):</p>`;
      if (criticals.length > 0) {
        html += `<table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>SLA Risk</th></tr>
          </thead>
          <tbody>
            ${criticals.map(i => `<tr onclick="window.viewIncidentDetail(${i.id}, true)"><td>#${i.id}</td><td>${i.title}</td><td><span class="badge badge-critical">${i.slaRisk}%</span></td></tr>`).join('')}
          </tbody>
        </table>`;
      }
      
      // Hook to filter main queue in UI
      setTimeout(() => {
        if (typeof window.switchView === "function") {
          window.switchView("incidents");
        }
        const filterPrio = document.getElementById("filter-priority");
        if (filterPrio) {
          filterPrio.value = "Critical";
          filterPrio.dispatchEvent(new Event("change"));
        }
      }, 300);
      
      return {
        text: `I've filtered the dashboard incident queue to display **Critical** tickets.`,
        html: html
      };
    }
    
    // Command 2: Reassign incident
    // "reassign ticket 103 to Sarah Jenkins" or "assign 103 to Alice"
    const reassignMatch = text.match(/(?:re)?assign\s+(?:ticket\s+)?#?(\d+)\s+to\s+([a-zA-Z\s]+)/i);
    if (reassignMatch) {
      const ticketId = parseInt(reassignMatch[1]);
      let targetEngName = reassignMatch[2].trim();
      
      // Fuzzy match name
      const engineer = PulseState.engineers.find(e => e.name.toLowerCase().includes(targetEngName.toLowerCase()));
      
      if (engineer) {
        const success = window.reassignIncident(ticketId, engineer.name);
        if (success) {
          return {
            text: `Successfully reassigned **Ticket #${ticketId}** to **${engineer.name}**.`,
            html: `<p>Workload capacities adjusted:</p>
            <ul>
              <li>${engineer.name} load: ${engineer.activeTickets}/${engineer.capacity} active tickets.</li>
            </ul>`
          };
        } else {
          return {
            text: `Failed to reassign Ticket #${ticketId}. Verify if ticket is active.`,
            html: null
          };
        }
      } else {
        return {
          text: `I couldn't find an engineer named "${targetEngName}". Available engineers: ${PulseState.engineers.map(e => e.name).join(', ')}.`,
          html: null
        };
      }
    }
    
    // Command 3: Why was ticket assigned to X
    // "why is ticket 101 assigned to Dave Miller" or "why was 101 assigned to Dave"
    const assignmentQueryMatch = text.match(/why\s+(?:is|was)\s+(?:ticket\s+)?#?(\d+)\s+assigned\s+to\s+([a-zA-Z\s\?]+)/i);
    if (assignmentQueryMatch) {
      const ticketId = parseInt(assignmentQueryMatch[1]);
      const ticket = PulseState.incidents.find(i => i.id === ticketId);
      
      if (ticket) {
        const assignedName = ticket.assignee;
        if (!assignedName) {
          return { text: `Ticket #${ticketId} is currently unassigned.`, html: null };
        }
        
        const eng = PulseState.engineers.find(e => e.name === assignedName);
        return {
          text: `Routing calculations for **Ticket #${ticketId}** (${ticket.category} category) assigning to **${assignedName}**:`,
          html: `
            <div class="copilot-affinity-breakdown">
              <p><strong>Affinity Scoring Breakdown:</strong></p>
              <div class="copilot-affinity-row">• Skill Match (${ticket.category}): <span class="text-success-color">+50 pts</span></div>
              <div class="copilot-affinity-row">• Queue Load Capacity (${eng.activeTickets}/${eng.capacity}): <span class="text-success-color">+25 pts</span></div>
              <div class="copilot-affinity-row">• Historic Reliability Index (${eng.reliability}%): <span class="text-success-color">+19 pts</span></div>
              <div class="copilot-affinity-total"><strong>Total Score: ${50 + 25 + Math.round(eng.reliability*0.2)} pts</strong></div>
            </div>
          `
        };
      } else {
        return { text: `Ticket #${ticketId} not found in state directory.`, html: null };
      }
    }

    // Command 4: SLA Risk Predict
    if (text.includes("predict next sla breach") || text.includes("predict breach") || text.includes("sla risk")) {
      const activeTickets = PulseState.incidents.filter(i => i.status === "Active" && i.slaRisk > 50);
      
      if (activeTickets.length > 0) {
        const primaryBreach = activeTickets.reduce((prev, current) => (prev.slaRisk > current.slaRisk) ? prev : current);
        
        return {
          text: `SLA Engine alerts **1 ticket at high risk of breach**:`,
          html: `
            <div class="copilot-alert-card">
              <p><strong>Ticket #${primaryBreach.id}: ${primaryBreach.title}</strong></p>
              <p>Risk Score: <span class="text-danger-bold">${primaryBreach.slaRisk}% Risk</span></p>
              <p>Estimated Resolution: ${primaryBreach.predictedTime} hours (SLA Limit: ${primaryBreach.slaLimit}h)</p>
            </div>
            <div class="chat-bubble-actions">
              <button class="chat-bubble-action-btn" onclick="executeRemediation(${primaryBreach.id})">Execute Fix: ${primaryBreach.remediationAction}</button>
            </div>
          `
        };
      } else {
        return { text: `SLA compliance is currently stable. No pending breaches predicted.`, html: null };
      }
    }
    
    // Command 5: Summarize today
    if (text.includes("summarize") || text.includes("summary") || text.includes("today's incidents")) {
      const activeCount = PulseState.incidents.filter(i => i.status === "Active").length;
      const criticalCount = PulseState.incidents.filter(i => i.status === "Active" && i.priority === "Critical").length;
      const highCount = PulseState.incidents.filter(i => i.status === "Active" && i.priority === "High").length;
      
      return {
        text: `Summary report of operations for **June 21, 2026**:`,
        html: `
          <table>
            <tr><td>Total Incidents Logged</td><td><strong>${PulseState.systemMetrics.incidentsToday}</strong></td></tr>
            <tr><td>Total Resolved</td><td><strong>${PulseState.systemMetrics.resolvedToday}</strong></td></tr>
            <tr><td>Active Queue Size</td><td><span class="text-warning-color">${activeCount} pending</span></td></tr>
            <tr><td>Critical / High Alarms</td><td><span class="text-danger-color">${criticalCount} Crit</span> / ${highCount} High</td></tr>
            <tr><td>SLA Compliance Rate</td><td><span class="text-success-color">${PulseState.systemMetrics.slaCompliance}%</span></td></tr>
          </table>
        `
      };
    }

    // Command 6: Apply fix / remediate ticket
    const fixMatch = text.match(/(?:remediate|fix|apply fix|resolve)\s+(?:ticket\s+)?#?(\d+)/i);
    if (fixMatch) {
      const ticketId = parseInt(fixMatch[1]);
      const ticket = PulseState.incidents.find(i => i.id === ticketId);
      if (ticket) {
        if (ticket.status === "Resolved") {
          return { text: `Ticket #${ticketId} is already resolved.`, html: null };
        }
        
        setTimeout(() => {
          window.resolveIncident(ticketId, "Triggered autonomous fix via AI Copilot console.");
        }, 1000);
        
        return {
          text: `Executing autonomous remediation for **Ticket #${ticketId}**...`,
          html: `<p>Action: <code>${ticket.recommendation}</code></p>
                 <p class="copilot-success-message">✓ Automated execution initialized. Checking pod state in 1s...</p>`
        };
      } else {
        return { text: `Ticket #${ticketId} not found.`, html: null };
      }
    }
    
    // Command 7: Anomaly check / CPU check
    if (text.includes("cpu") || text.includes("latency") || text.includes("system stats")) {
      return {
        text: `System telemetry check:`,
        html: `
          <table>
            <tr><td>Global CPU Load</td><td><span class="font-bold">${PulseState.systemMetrics.cpu}%</span></td></tr>
            <tr><td>Database Latency</td><td><strong>${PulseState.systemMetrics.dbLatency} ms</strong></td></tr>
            <tr><td>API Error Rate</td><td><strong>${PulseState.systemMetrics.errorRate}%</strong></td></tr>
          </table>
          <p class="copilot-muted-footer">Trend forecasts stable operation metrics for next 30 minutes.</p>
        `
      };
    }

    // Default Help response
    return {
      text: `Hello! I'm the **PulseOps AI Copilot**. I analyze real-time state logs and coordinate operations.`,
      html: `
        <p>Available commands you can try:</p>
        <ul class="copilot-help-list">
          <li><code>Show critical incidents</code> - Filter current queue</li>
          <li><code>Summarize today</code> - Get high-level operation KPIs</li>
          <li><code>Predict SLA risks</code> - Project breach probabilities</li>
          <li><code>Why is ticket 101 assigned to Dave?</code> - Check scoring logic</li>
          <li><code>Reassign ticket 103 to Alice Wong</code> - Delegate active load</li>
          <li><code>Fix ticket 103</code> - Trigger auto-remediation code</li>
        </ul>
      `
    };
  }
};
