// Main Controller & UI Coordinator for PulseOps AI
document.addEventListener("DOMContentLoaded", () => {

  // Active Navigation State
  let currentActiveIncidentId = 101;
  let pipelineRunning = false;

  // Cache DOM Nodes
  const navButtons = document.querySelectorAll(".nav-btn-item");
  const views = document.querySelectorAll(".app-view");
  const copilotForm = document.getElementById("copilot-chat-form");
  const copilotInput = document.getElementById("copilot-input-box");
  const chatHistory = document.getElementById("copilot-chat-history");
  const copilotToggle = document.getElementById("copilot-layout-toggle");
  const copilotPanel = document.getElementById("copilot-sidebar-panel");
  const hamburgerBtn = document.getElementById("hamburger-menu-btn");
  const sidebar = document.getElementById("sidebar-panel");

  // Mock Email Alert Templates
  const emailAlertTemplates = [
    {
      sender: "monitor-alarm-db@pulseops.ai",
      subject: "ALERT: Database connection pool deadlock detected",
      body: "Database cluster payments-prod-replica is reporting query queue lengths exceeding 250 items. Transaction execution timed out. Impacting API gateways checkout throughput."
    },
    {
      sender: "security-auditor@pulseops.ai",
      subject: "WARNING: Public S3 assets bucket configuration drift",
      body: "IAM policy audit warns bucket assets-delivery has public write permissions. S3:PutObject privilege allowed to all principals. Access Denied logs accumulating."
    },
    {
      sender: "gateway-monitor@pulseops.ai",
      subject: "ALERT: Ingress traffic spike causing Nginx 504 timeouts",
      body: "API Gateway Nginx reports ingress connections saturation. Auth-service response latency has spiked to 12s under peak user login load."
    },
    {
      sender: "cron-scheduler@pulseops.ai",
      subject: "ERROR: Billing ledger calculation job aborted",
      body: "Cron job billing-scheduler terminated with database deadlock exit code 1213. Transaction logs indicate resource contentions."
    }
  ];

  // Navigation Router (Instant View transitions)
  function switchView(targetViewId) {
    const mainContent = document.querySelector("main.main-content");
    if (mainContent) {
      mainContent.classList.add("screen-glitch-effect");
      setTimeout(() => {
        mainContent.classList.remove("screen-glitch-effect");
      }, 250);
    }

    views.forEach(v => v.classList.remove("active"));
    navButtons.forEach(btn => btn.classList.remove("active"));

    const targetView = document.getElementById(targetViewId + "-view");
    if (targetView) targetView.classList.add("active");

    const navBtn = document.querySelector(`[data-view="${targetViewId}"]`);
    if (navBtn) navBtn.parentElement.classList.add("active");

    // Title updates
    const titles = {
      "dashboard": { main: "Incident Control Dashboard", sub: "Autonomous Ops Control Room" },
      "incidents": { main: "Incident Management Queue", sub: "AI Triaged Operational Logs" },
      "resolve-center": { main: "Resolution submission Center", sub: "Submit operator resolutions" },
      "resources": { main: "Workforce Resource Planner", sub: "Skill-matching & Workload Allocation" },
      "insights": { main: "AI Insights", sub: "AI diagnostic analysis and resolution recommendations" }
    };

    if (titles[targetViewId]) {
      document.getElementById("page-main-title").innerText = titles[targetViewId].main;
      document.getElementById("page-sub-title").innerText = titles[targetViewId].sub;
    }

    // Refresh layout data
    renderActiveViewData();

    // Force close mobile drawer
    if (sidebar.classList.contains("visible")) {
      sidebar.classList.remove("visible");
    }
  }

  // Expose router globally for Copilot navigation
  window.switchView = switchView;

  // Bind Navbar Clicks
  navButtons.forEach(li => {
    const btn = li.querySelector(".nav-btn");
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-view");
      switchView(target);
    });
  });

  // Render Functions
  function renderKPIs() {
    const active = PulseState.incidents.filter(i => i.status === "Active");
    const critical = active.filter(i => i.priority === "Critical");
    const risk = active.filter(i => i.slaRisk > 75);

    updateText("kpi-total-open", active.length);
    updateText("kpi-critical", critical.length);
    updateText("kpi-sla-risk", risk.length);
    updateText("kpi-resolved", PulseState.systemMetrics.resolvedToday);
    updateText("kpi-compliance", `${PulseState.systemMetrics.slaCompliance}%`);
  }

  function renderIncidentTable(incidentsList, tableBodyId) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    if (incidentsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty-row">No active incidents in worklist.</td></tr>`;
      return;
    }

    tbody.innerHTML = incidentsList.map(inc => {
      const isSelected = inc.id === currentActiveIncidentId ? "class='active-row'" : "";
      const priorityClass = `badge-${inc.priority.toLowerCase()}`;
      const statusClass = `badge-${inc.status.toLowerCase()}`;

      const createdDate = new Date(inc.createdAt);
      const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <tr ${isSelected} onclick="window.viewIncidentDetail(${inc.id}, true)">
          <td>#${inc.id}</td>
          <td class="td-title">${inc.title}</td>
          <td><span class="badge ${priorityClass}">${inc.priority}</span></td>
          <td><span class="badge ${statusClass}">${inc.status}</span></td>
          <td>${inc.assignee || `<span class="text-warning-bold">Unassigned</span>`}</td>
          <td>${timeStr}</td>
        </tr>
      `;
    }).join("");
  }

  function renderTimeline(timelineId) {
    const timeline = document.getElementById(timelineId);
    if (!timeline) return;

    const recentIncidents = PulseState.incidents.slice(0, 3);

    timeline.innerHTML = recentIncidents.map(inc => {
      const typeClass = inc.priority === "Critical" ? "danger" : (inc.priority === "High" ? "warning" : "active");
      const time = new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="timeline-item ${typeClass}">
          <div class="timeline-dot"></div>
          <div class="timeline-time">${time}</div>
          <div class="timeline-text"><strong>Ticket #${inc.id} Ingested</strong>: ${inc.title}</div>
          <div class="timeline-subtext">Category: ${inc.category} • Urgency: ${inc.urgency}</div>
        </div>
      `;
    }).join("");
  }

  // Close modal helper
  window.closeIncidentModal = function() {
    const modal = document.getElementById("incident-detail-modal");
    if (modal) modal.style.display = "none";
  };

  // Update Detail Panel on Select
  window.viewIncidentDetail = function (id, userTriggered = false) {
    currentActiveIncidentId = id;

    // Highlight Row
    document.querySelectorAll("table.incident-table tbody tr").forEach(tr => tr.classList.remove("selected"));

    const incident = PulseState.incidents.find(i => i.id === id);
    if (!incident) return;

    if (userTriggered) {
      const modal = document.getElementById("incident-detail-modal");
      if (modal) modal.style.display = "block";
    }

    const detailBox = document.getElementById("selected-incident-details");
    if (!detailBox) return;

    const riskClass = incident.slaRisk > 75 ? "high" : (incident.slaRisk > 40 ? "medium" : "low");
    const priorityBadge = `badge-${incident.priority.toLowerCase()}`;
    const statusBadge = `badge-${incident.status.toLowerCase()}`;    let actionButtons = "";
    if (incident.status !== "Resolved") {
      actionButtons += `<button class="btn btn-primary" onclick="window.applyIncidentFix(${incident.id})">
        <svg class="icon-svg-inline" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Apply Recommended Fix
      </button>`;
    } else {
      actionButtons = `<p class="badge-success-uppercase">
        ✓ Incident Resolved
      </p>`;
    }

    // Reassignment picker
    let assignmentHtml = "";
    if (incident.status !== "Resolved") {
      assignmentHtml = `
        <div class="form-group reassign-form-group">
          <label class="reassign-label">REASSIGN ENGINEER</label>
          <select class="filter-select" onchange="window.reassignIncidentFromSelector(${incident.id}, this.value)">
            <option value="">-- Choose Operator --</option>
            ${PulseState.engineers.map(e => `<option value="${e.name}" ${e.name === incident.assignee ? "selected" : ""}>${e.name} (${e.activeTickets}/${e.capacity} load)</option>`).join("")}
          </select>
        </div>
      `;
    } else {
      assignmentHtml = `
        <div class="detail-row">
          <div class="detail-label">Assignee</div>
          <div class="detail-value">${incident.assignee || "Unassigned"}</div>
        </div>
      `;
    }

    detailBox.innerHTML = `
      <div class="detail-view">
        <div class="card-header card-header-no-margin">
          <div class="card-title">Ticket #${incident.id} Details</div>
          <span class="badge ${statusBadge}">${incident.status}</span>
        </div>
        
        <h4 class="detail-incident-title">${incident.title}</h4>
        <p class="detail-incident-desc">${incident.description}</p>
        
        <div class="detail-info-grid">
          <div class="detail-row">
            <div class="detail-label">Category</div>
            <div class="detail-value">${incident.category}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Priority Scoring</div>
            <div class="detail-value"><span class="badge ${priorityBadge}">${incident.priority}</span></div>
          </div>
          ${assignmentHtml}
        </div>
        
        <div class="sla-risk-card">
          <div class="sla-risk-header">
            <span class="sla-risk-probability-text">SLA Breach Probability</span>
            <span class="sla-risk-percent">${incident.slaRisk}% Risk</span>
          </div>
          <div class="sla-risk-meter">
            <div class="sla-risk-fill ${riskClass}" style="width: ${incident.slaRisk}%;"></div>
          </div>
          <div class="sla-risk-footer">
            <span>Est. Duration: ${incident.predictedTime} hours</span>
            <span>Limit SLA: ${incident.slaLimit}h</span>
          </div>
        </div>

        <div class="ai-insights-card">
          <h5 class="ai-insights-header">
            <svg class="icon-svg-inline" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            AI Insight Engine
          </h5>
          <p class="ai-insights-rca"><strong>Root Cause (RCA):</strong> ${incident.rca}</p>
          <p class="ai-insights-recommendation"><strong>Recommendation:</strong> ${incident.recommendation}</p>
        </div>

        <div class="detail-action-footer">
          ${actionButtons}
        </div>
      </div>
    `;

    // Hook row selections
    document.querySelectorAll("table.incident-table tbody tr").forEach(tr => {
      const cellText = tr.querySelector("td").innerText;
      if (cellText === `#${id}`) tr.classList.add("selected");
    });
  };

  // Reassignment select triggers
  window.reassignIncidentFromSelector = function (id, engineerName) {
    if (!engineerName) return;
    const success = window.reassignIncident(id, engineerName);
    if (success) {
      appendAIResponse(`Reassigned ticket #${id} to **${engineerName}**.`);
      renderActiveViewData();
    }
  };

  // Resolve trigger from button
  window.applyIncidentFix = function (id) {
    const incident = PulseState.incidents.find(i => i.id === id);
    if (!incident) return;

    const success = window.resolveIncident(id, incident.recommendation, incident.rca);
    if (success) {
      appendAIResponse(`Applied recommended fix for Ticket #${id}: *${incident.recommendation}*. Incident closed.`);
      renderActiveViewData();

      // Print to resolution log terminal
      const term = document.getElementById("vector-ingest-terminal");
      if (term) {
        term.innerHTML += `<div style="color: #00FF66;">&gt; [AUTO-FIX] Solution updated in backend logs for ticket #${id}.</div>`;
        term.scrollTop = term.scrollHeight;
      }
    }
  };

  // Dynamic selector for Copilot button clicks
  window.executeRemediation = function (id) {
    const incident = PulseState.incidents.find(i => i.id === id);
    if (!incident) return;

    const success = window.resolveIncident(id, incident.recommendation, incident.rca);
    if (success) {
      appendAIResponse(`Recovery script applied for Incident #${id}. Closed ticket.`);
      renderActiveViewData();
    }
  };

  // Render Resource Allocation grid
  function renderResourcesGrid() {
    const container = document.getElementById("resources-grid-container");
    if (!container) return;

    container.innerHTML = PulseState.engineers.map(eng => {
      const loadPercent = Math.min(100, Math.round((eng.activeTickets / eng.capacity) * 100));
      const loadColor = loadPercent > 80 ? "var(--color-danger)" : (loadPercent > 50 ? "var(--color-warning)" : "var(--color-success)");

      return `
        <div class="glass-card resource-card">
          <div class="resource-header">
            <div class="resource-header-left">
              <div class="user-avatar">${eng.avatar}</div>
              <div>
                <div class="resource-name">${eng.name}</div>
                <div class="resource-status-text">${eng.status}</div>
              </div>
            </div>
            <span class="badge ${eng.activeTickets > 0 ? "badge-critical" : "badge-active"}">${eng.activeTickets > 0 ? "Busy" : "Available"}</span>
          </div>
          
          <div class="resource-metrics">
            <div>
              <div class="metric-label">Reliability</div>
              <div class="metric-value">${eng.reliability}%</div>
            </div>
            <div>
              <div class="metric-label">Active Load</div>
              <div class="metric-value">${eng.activeTickets} / ${eng.capacity}</div>
            </div>
          </div>

          <div>
            <div class="resource-load-header">
              <span style="color:var(--text-secondary)">Load Index</span>
              <span class="resource-load-percent" style="color:${loadColor}">${loadPercent}%</span>
            </div>
            <div class="resource-load-bar">
              <div class="resource-load-fill" style="width: ${loadPercent}%; background: ${loadColor};"></div>
            </div>
          </div>

          <div>
            <div class="skill-label">Specialties</div>
            <div class="skill-tag-list">
              ${eng.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Render AI Insights page details
  function renderAIInsightsView() {
    const select = document.getElementById("insights-incident-select");
    const container = document.getElementById("ai-insights-details-container");
    if (!select || !container) return;

    // Save selection
    const selectedId = select.value;

    // Populate dropdown with all incidents
    select.innerHTML = '<option value="">-- Choose Incident for AI Diagnostic Analysis --</option>' +
      PulseState.incidents.map(i => `<option value="${i.id}">#${i.id}: ${i.title} (${i.status})</option>`).join("");

    if (selectedId) {
      select.value = selectedId;
      populateAIInsightsDetails(parseInt(selectedId));
    } else if (PulseState.incidents.length > 0) {
      // Auto-select first incident by default
      select.value = PulseState.incidents[0].id;
      populateAIInsightsDetails(PulseState.incidents[0].id);
    }
  }

  function populateAIInsightsDetails(incidentId) {
    const container = document.getElementById("ai-insights-details-container");
    if (!container) return;

    const incident = PulseState.incidents.find(i => i.id === incidentId);
    if (!incident) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";

    // Diagnostic context
    const statusNode = document.getElementById("insight-incident-status");
    statusNode.innerText = incident.status;
    statusNode.className = "badge badge-" + incident.status.toLowerCase();
    
    document.getElementById("insight-incident-title").innerText = incident.title;
    document.getElementById("insight-incident-desc").innerText = incident.description;
    document.getElementById("insight-incident-cat").innerText = incident.category;
    document.getElementById("insight-incident-priority").innerHTML = `<span class="badge badge-${incident.priority.toLowerCase()}">${incident.priority}</span>`;

    // Routing rationale
    const rationaleNode = document.getElementById("insight-routing-rationale");
    if (incident.assignee) {
      const eng = PulseState.engineers.find(e => e.name === incident.assignee) || { reliability: 92, activeTickets: 0, capacity: 3, skills: [incident.category] };
      const skillsPoints = eng.skills.includes(incident.category) ? 50 : 10;
      const capacityPoints = Math.round((eng.capacity - eng.activeTickets) / eng.capacity * 30);
      const reliabilityPoints = Math.round(eng.reliability * 0.2);
      const totalScore = skillsPoints + capacityPoints + reliabilityPoints;

      rationaleNode.innerHTML = `
        <p>This incident was routed and assigned to <strong>${incident.assignee}</strong> based on the routing scoring matrix:</p>
        <div class="insights-matrix-container">
          <div>• <strong>Skill Set Match (${incident.category})</strong>: <span class="text-success">+${skillsPoints} pts</span></div>
          <div>• <strong>Queue Load Capacity (${eng.activeTickets}/${eng.capacity})</strong>: <span class="text-success">+${capacityPoints} pts</span></div>
          <div>• <strong>Historical Reliability (${eng.reliability}%)</strong>: <span class="text-success">+${reliabilityPoints} pts</span></div>
          <div class="insights-matrix-total">
            <strong>Total Assignment Match Score: ${totalScore} pts</strong>
          </div>
        </div>
        <p class="insights-solved-history">
          <strong>Solved History Context</strong>: ${incident.assignee} has successfully resolved ${incident.status === 'Resolved' ? 'this and other similar' : 'similar'} ${incident.category} incidents in the past 30 days, achieving a rolling SLA compliance of ${eng.reliability}%.
        </p>
      `;
    } else {
      rationaleNode.innerHTML = `
        <p class="text-warning">No engineer is currently assigned to this incident.</p>
        <p class="insights-unassigned-secondary">The dispatch supervisor is currently polling active SRE profiles. Try assigning an engineer from the Incident details popup.</p>
      `;
    }

    // AI Actionable Recommendations / Solved details
    const solHeader = document.getElementById("insight-solution-header");
    const solDetails = document.getElementById("insight-solution-details");
    
    if (incident.status === "Resolved") {
      solHeader.innerText = "Applied Solution (Resolved)";
      solDetails.innerHTML = `
        <div class="flex-col-gap12">
          <div>
            <strong>Root Cause Analysis (RCA):</strong>
            <p class="insights-solution-text">${incident.rca || "Undetermined system variation."}</p>
          </div>
          <div>
            <strong>Remediation Applied:</strong>
            <p class="insights-solution-code">${incident.recommendation || incident.remediationAction || "Restart applied."}</p>
          </div>
          <div class="insights-success-tag">
            ✓ SLA target met. Resolution loop completed successfully.
          </div>
        </div>
      `;
    } else {
      solHeader.innerText = "Suggested AI Remediation Steps";
      
      // Look up suggestions in KB
      const matchedKb = PulseState.kb.find(k => k.category.toLowerCase() === incident.category.toLowerCase()) || {
        title: "Standard system check",
        remediation: "Restart container / application node and verify health diagnostics.",
        rca: "Undetermined system variation."
      };

      solDetails.innerHTML = `
        <div class="flex-col-gap12">
          <p style="color: var(--text-secondary);">Based on similar historical diagnostic profiles, the following runbook is recommended:</p>
          <div class="insights-runbook-header">
            <strong class="text-primary-color">${matchedKb.title}</strong>
          </div>
          <div>
            <strong>Predicted Root Cause:</strong>
            <p class="insights-rca-text">${incident.rca || matchedKb.rca}</p>
          </div>
          <div>
            <strong>Recommended Fix Actions:</strong>
            <pre class="insights-recommendation-code">${incident.recommendation || matchedKb.remediation}</pre>
          </div>
          <div class="insights-action-wrapper">
            <button class="btn btn-primary btn-apply-fix" onclick="window.applyIncidentFix(${incident.id})">
              Apply AI Suggested Fix
            </button>
          </div>
        </div>
      `;
    }

    const slaDetails = document.getElementById("insight-sla-analysis-details");
    if (slaDetails) {
      const riskClass = incident.slaRisk > 75 ? "high" : (incident.slaRisk > 40 ? "medium" : "low");
      const statusText = incident.status === "Resolved" ? "SLA Met" : (incident.slaRisk > 75 ? "CRITICAL BREACH RISK" : "SLA Within Bounds");
      const riskColor = incident.slaRisk > 75 ? "var(--color-danger)" : (incident.slaRisk > 40 ? "var(--color-warning)" : "var(--color-success)");
      
      slaDetails.innerHTML = `
        <div class="flex-col-gap12">
          <div class="flex-justify-between-align-center">
            <span class="sla-forecast-label">SLA Status Forecast</span>
            <span class="sla-forecast-status" style="color:${riskColor};">${statusText}</span>
          </div>
          
          <div class="sla-forecast-card">
            <div class="sla-forecast-header">
              <span style="color:var(--text-secondary)">SLA Breach Probability</span>
              <span style="color:${riskColor}; font-weight:700;">${incident.slaRisk}% Risk</span>
            </div>
            <div class="sla-risk-meter margin-y-6">
              <div class="sla-risk-fill ${riskClass}" style="width: ${incident.slaRisk}%;"></div>
            </div>
            <div class="sla-forecast-footer">
              <span>Est. MTTR: ${incident.predictedTime} hours</span>
              <span>Limit: ${incident.slaLimit}h</span>
            </div>
          </div>
          
          <div class="sla-forecast-impact">
            <strong>Impact Assessment:</strong>
            <p class="sla-forecast-desc">
              ${incident.status === 'Resolved' 
                ? 'This incident has been resolved. No further SLA breach risks exist.' 
                : (incident.slaRisk > 75 
                  ? 'High risk of breaching SRE SLA limits. Immediate intervention is required. Recommend reassigning to a high-capacity specialist or applying remediation immediately.' 
                  : 'SLA parameters are currently healthy. Continue monitoring connection load.')}
            </p>
          </div>
        </div>
      `;
    }
  }

  // Populates dropdown list of active tickets
  function renderResolutionFormSelect() {
    const select = document.getElementById("resolution-ticket-select");
    if (!select) return;

    const activeIncidents = PulseState.incidents.filter(i => i.status === "Active");

    // Save current selection value
    const currentVal = select.value;

    select.innerHTML = '<option value="">-- Choose Active Incident --</option>' +
      activeIncidents.map(i => `<option value="${i.id}">#${i.id}: ${i.title}</option>`).join("");

    select.value = currentVal;
  }

  // Refreshes data across active tab views
  function renderActiveViewData() {
    renderKPIs();

    // 1. Dashboard View
    renderIncidentTable(PulseState.incidents.slice(0, 5), "dashboard-incident-tbody");
    renderTimeline("dashboard-timeline");
    PulseCharts.drawCategoryPie("dashboard-pie-container");

    // 2. Incident Queue View
    const searchVal = document.getElementById("incident-search-input")?.value.toLowerCase() || "";
    const filterPrio = document.getElementById("filter-priority")?.value || "all";
    const filterCat = document.getElementById("filter-category")?.value || "all";

    const filtered = PulseState.incidents.filter(inc => {
      const matchesSearch = inc.title.toLowerCase().includes(searchVal) || inc.description.toLowerCase().includes(searchVal) || inc.id.toString().includes(searchVal);
      const matchesPriority = filterPrio === "all" || inc.priority === filterPrio;
      const matchesCategory = filterCat === "all" || inc.category === filterCat;
      return matchesSearch && matchesPriority && matchesCategory;
    });

    renderIncidentTable(filtered, "incidents-queue-tbody");
    
    // 3. Submit Resolution View
    renderResolutionFormSelect();

    // 4. Resource Allocation View
    renderResourcesGrid();

    // 5. AI Insights view
    renderAIInsightsView();
  }

  // Helper
  function updateText(id, text) {
    const node = document.getElementById(id);
    if (node) node.innerText = text;
  }

  // Search/Filters in Queue
  const searchBar = document.getElementById("incident-search-input");
  const filterPriority = document.getElementById("filter-priority");
  const filterCategory = document.getElementById("filter-category");

  if (searchBar) searchBar.addEventListener("input", renderActiveViewData);
  if (filterPriority) filterPriority.addEventListener("change", renderActiveViewData);
  if (filterCategory) filterCategory.addEventListener("change", renderActiveViewData);

  // Copilot Message UI Helpers
  function appendUserMessage(text) {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble user";
    bubble.innerText = text;
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function appendAIResponse(text, html = null) {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble ai animate-fade-in";

    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    bubble.innerHTML = `<p>${formattedText}</p>`;

    if (html) {
      const container = document.createElement("div");
      container.style.marginTop = "8px";
      container.innerHTML = html;
      bubble.appendChild(container);
    }

    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    const indicator = document.createElement("div");
    indicator.className = "chat-bubble ai typing animate-fade-in";
    indicator.id = "copilot-typing-indicator";
    indicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    chatHistory.appendChild(indicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("copilot-typing-indicator");
    if (indicator) indicator.remove();
  }

  copilotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = copilotInput.value;
    if (!query.trim()) return;

    appendUserMessage(query);
    copilotInput.value = "";
    showTypingIndicator();

    if (PulseState.backendConnected) {
      fetch("http://localhost:8000/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query })
      })
        .then(res => res.json())
        .then(res => {
          removeTypingIndicator();
          appendAIResponse(res.text, res.html);
          if (res.action_type) {
            syncWithBackend();
          }
        })
        .catch(err => {
          console.error("Backend copilot error, offline parser:", err);
          removeTypingIndicator();
          const res = PulseCopilot.processMessage(query);
          appendAIResponse(res.text, res.html);
        });
    } else {
      setTimeout(() => {
        removeTypingIndicator();
        const res = PulseCopilot.processMessage(query);
        appendAIResponse(res.text, res.html);
      }, 800);
    }
  });

  // Copilot toggles
  copilotToggle.addEventListener("click", () => {
    copilotPanel.classList.toggle("visible");
  });

  const copilotMinusBtn = document.getElementById("copilot-minus-btn");
  if (copilotMinusBtn) {
    copilotMinusBtn.addEventListener("click", () => {
      copilotPanel.classList.remove("visible");
    });
  }

  hamburgerBtn.addEventListener("click", () => {
    sidebar.classList.toggle("visible");
  });

  // Click outside to close drawers on mobile/tablet viewports
  document.addEventListener("click", (e) => {
    // Close sidebar if clicking outside of it and the hamburger button
    if (sidebar.classList.contains("visible") &&
        !sidebar.contains(e.target) &&
        !hamburgerBtn.contains(e.target)) {
      sidebar.classList.remove("visible");
    }
    // Close copilot popup if clicking outside of it and the floating toggle button
    if (copilotPanel.classList.contains("visible") &&
        !copilotPanel.contains(e.target) &&
        !copilotToggle.contains(e.target)) {
      copilotPanel.classList.remove("visible");
    }
  });

  // Event trigger for simulated raw email pipeline (WOW factor animation!)
  const alarmBtn = document.getElementById("trigger-simulation-alarm-btn");
  alarmBtn.addEventListener("click", () => {
    if (pipelineRunning) return;
    pipelineRunning = true;
    alarmBtn.disabled = true;

    // Choose random email alert template
    const template = emailAlertTemplates[Math.floor(Math.random() * emailAlertTemplates.length)];

    const stepRecv = document.getElementById("sim-step-recv");
    const stepTriage = document.getElementById("sim-step-triage");
    const stepRAG = document.getElementById("sim-step-rag");
    const stepAlloc = document.getElementById("sim-step-alloc");

    // Reset steps classes
    [stepRecv, stepTriage, stepRAG, stepAlloc].forEach(s => {
      s.className = "sim-step";
    });

    // Visual Step 1: Parser
    stepRecv.classList.add("active");

    setTimeout(() => {
      stepRecv.classList.remove("active");
      stepRecv.classList.add("completed");
      stepTriage.classList.add("active");

      // Visual Step 2: Triage
      setTimeout(() => {
        stepTriage.classList.remove("active");
        stepTriage.classList.add("completed");
        stepRAG.classList.add("active");

        // Visual Step 3: RAG Search
        setTimeout(() => {
          stepRAG.classList.remove("active");
          stepRAG.classList.add("completed");
          stepAlloc.classList.add("active");

          // Visual Step 4: Assignment Allocation
          setTimeout(() => {
            stepAlloc.classList.remove("active");
            stepAlloc.classList.add("completed");

            // Execute Ingest Call
            const emailRaw = `Subject: ${template.subject}\nFrom: alarms@pulseops.ai\n\n${template.body}`;

            if (PulseState.backendConnected) {
              fetch("http://localhost:8000/api/email-simulation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email_text: emailRaw })
              })
                .then(res => res.json())
                .then(res => {
                  syncWithBackend().then(() => {
                    appendAIResponse(`New alert email parsed successfully! Created Ticket #${res.incident.id} and assigned to **${res.incident.assignee}**.`);
                  });
                });
            } else {
              const res = window.addIncident(template.subject, template.body, template.subject.includes("Database") ? "Database" : "Application");
              appendAIResponse(`[Offline Simulation] Alert parsed. Ingested Ticket #${res.id} and assigned to **${res.assignee}**.`);
              renderActiveViewData();
            }

            pipelineRunning = false;
            alarmBtn.disabled = false;
          }, 500);
        }, 500);
      }, 500);
    }, 500);
  });

  // Form submission for resolution upserts
  const resolutionForm = document.getElementById("resolution-submission-form");
  resolutionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const select = document.getElementById("resolution-ticket-select");
    const ticketId = parseInt(select.value);
    const rca = document.getElementById("resolution-rca-input").value;
    const solution = document.getElementById("resolution-solution-input").value;
    const term = document.getElementById("vector-ingest-terminal");

    if (!ticketId || !solution || !rca) return;

    // UI Terminal logging logs
    if (term) {
      term.innerHTML += `<div style="color: #FFAA00; margin-top:8px;">&gt; [TRIGGER] Resolving ticket #${ticketId}...</div>`;
      term.innerHTML += `<div>&gt; [DIAGNOSTIC PROCESSOR] Analyzing solution steps.</div>`;
      term.innerHTML += `<div>&gt; [KNOWLEDGE BASE] Updating documentation for ticket #${ticketId}...</div>`;
      term.scrollTop = term.scrollHeight;
    }

    if (PulseState.backendConnected) {
      fetch("http://localhost:8000/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId, notes: solution, rca: rca })
      })
        .then(res => res.json())
        .then(() => {
          syncWithBackend().then(() => {
            if (term) {
              term.innerHTML += `<div style="color: #00FF66;">&gt; [SUCCESS] Update synced. Knowledge Base recalculated resolution metrics.</div>`;
              term.scrollTop = term.scrollHeight;
            }
            resolutionForm.reset();
          });
        });
    } else {
      setTimeout(() => {
        window.resolveIncident(ticketId, solution, rca);
        // Sync local KB array
        const incident = PulseState.incidents.find(i => i.id === ticketId);
        PulseState.kb.push({
          id: `kb-${ticketId}`,
          title: incident.title,
          keywords: [incident.category],
          remediation: solution,
          rca: rca,
          category: incident.category
        });

        if (term) {
          term.innerHTML += `<div style="color: #00FF66;">&gt; [SUCCESS] Offline resolution logged. KB index expanded.</div>`;
          term.scrollTop = term.scrollHeight;
        }
        renderActiveViewData();
        resolutionForm.reset();
      }, 600);
    }
  });

  // State Change Bindings
  window.addEventListener("pulse-state-changed", () => {
    renderActiveViewData();
  });

  // Backend Integration Helper Methods
  function syncWithBackend() {
    return fetch("http://localhost:8000/api/state")
      .then(res => res.json())
      .then(data => {
        PulseState.incidents = data.incidents;
        PulseState.engineers = data.engineers;
        PulseState.kb = data.kb;
        PulseState.systemMetrics = data.metrics;
        renderActiveViewData();
      })
      .catch(err => console.error("Error syncing backend state:", err));
  }

  function bindBackendActions() {
    window.addIncident = function (title, description, category) {
      return fetch("http://localhost:8000/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category })
      })
        .then(res => res.json())
        .then(res => {
          syncWithBackend();
          return res.incident;
        })
        .catch(err => console.error("Error adding incident to backend:", err));
    };

    window.resolveIncident = function (id, notes, rca) {
      return fetch("http://localhost:8000/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: parseInt(id), notes, rca })
      })
        .then(res => res.json())
        .then(() => {
          syncWithBackend();
          return true;
        })
        .catch(() => false);
    };

    window.reassignIncident = function (id, engineerName) {
      return fetch("http://localhost:8000/api/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: parseInt(id), assignee: engineerName })
      })
        .then(res => res.json())
        .then(() => {
          syncWithBackend();
          return true;
        })
        .catch(() => false);
    };
  }

  // Bind change event to insights incident selector
  const insightsSelect = document.getElementById("insights-incident-select");
  if (insightsSelect) {
    insightsSelect.addEventListener("change", (e) => {
      populateAIInsightsDetails(parseInt(e.target.value));
    });
  }

  // Quick prompt helper
  window.sendQuickPrompt = function(promptText) {
    const input = document.getElementById("copilot-input-box");
    if (input) {
      input.value = promptText;
      const form = document.getElementById("copilot-chat-form");
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    }
  };





  // Boot sequence simulation
  const bootOverlay = document.getElementById("boot-overlay");
  const bootLog = document.getElementById("boot-terminal-log");
  if (bootOverlay && bootLog) {
    const bootLines = [
      "SYSTEM INIT: CONFIGURING PORT ADAPTERS...",
      "AUTHENTICATING SRE SITE RELIABILITY OPERATOR...",
      "ESTABLISHING SECURE MULTI-AGENT CORRELATION TUNNEL...",
      "SYNCHRONIZING INCIDENT TELEMETRY FROM CLUSTER ENDPOINTS...",
      "COMPILING SLA BREACH PROBABILITY FORECASTS...",
      "PULSEOPS AI v1.0.0 LOADED SUCCESSFULLY. WELCOME."
    ];

    let lineIdx = 0;
    function printBootLine() {
      if (lineIdx < bootLines.length) {
        const lineEl = document.createElement("div");
        lineEl.className = "boot-console-line typed";
        lineEl.innerText = `> ${bootLines[lineIdx]}`;
        bootLog.appendChild(lineEl);
        lineIdx++;
        setTimeout(printBootLine, 180);
      } else {
        setTimeout(() => {
          bootOverlay.classList.add("fade-out");
          setTimeout(() => {
            bootOverlay.style.display = "none";
          }, 600);
        }, 300);
      }
    }
    printBootLine();
  }

  // Initialize view routes
  switchView("dashboard");

  // Healthcheck for Python FastAPI Backend
  PulseState.backendConnected = false;
  fetch("http://localhost:8000/api/health")
    .then(res => res.json())
    .then(res => {
      if (res.status === "healthy") {
        PulseState.backendConnected = true;
        bindBackendActions();
        syncWithBackend().then(() => {
          appendAIResponse("System online: Synced with **Python Multi-Agent Backend**.");
        });
      } else {
        renderActiveViewData();
      }
    })
    .catch(err => {
      console.log("No Python backend detected. Running in client-side simulation mode.");
      renderActiveViewData();
    })
    .finally(() => {
      // PulseScheduler.startSimulation(); // Disabled automatic simulation for recruiter mode
    });
});
