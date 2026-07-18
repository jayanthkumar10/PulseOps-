// Centralized State Management for PulseOps AI
window.PulseState = {
  currentUser: {
    name: "Alex Carter",
    role: "Ops Engineer", // Default role
    avatar: "AC"
  },
  
  systemMetrics: {
    cpu: 64,
    memory: 78,
    dbLatency: 45,
    errorRate: 1.2,
    incidentsToday: 24,
    resolvedToday: 19,
    slaCompliance: 96.2,
    cpuHistory: Array(30).fill(60).map((v, i) => v + Math.sin(i / 2) * 5),
    latencyHistory: Array(30).fill(40).map((v, i) => v + Math.cos(i / 3) * 8)
  },

  incidents: [
    {
      id: 101,
      title: "Database latency affecting customer checkout transactions",
      category: "Database",
      priority: "Critical",
      impact: "High",
      urgency: "Immediate",
      status: "Active",
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
      slaLimit: 4, // Hours
      predictedTime: 4.8, // Predicted to take 4.8 hours
      slaRisk: 92, // 92% probability of breach
      assignee: "Dave Miller",
      description: "Database cluster checkout-prod-replica is reporting query queue lengths exceeding 200 items. Transaction commit times have spiked to 5.4 seconds, causing checkout page timeouts.",
      rca: "Missing query index on customers search parameter coupled with locking writes on order creation.",
      recommendation: "Apply missing database index 'IX_CHECKOUT_SEARCH' on the tables and redirect read queries to secondary replica.",
      remediationAction: "Apply IX_CHECKOUT_SEARCH Index",
      logs: [
        { time: "10:42 AM", text: "Incident detected by auto-monitor rule DB_LATENCY_SPIKE." },
        { time: "10:43 AM", text: "AI Classification Agent assigned Priority: Critical, Category: Database." },
        { time: "10:43 AM", text: "RAG Retrieval returned 3 matching runbooks." },
        { time: "10:44 AM", text: "SLA Predictor marked Breach Risk at 92% (Estimated 4.8h vs 4.0h limit)." },
        { time: "10:44 AM", text: "Routed and assigned to Dave Miller based on DB Expertise (96% reliability)." }
      ]
    },
    {
      id: 102,
      title: "S3 upload failures in asset-delivery bucket - Access Denied",
      category: "Security",
      priority: "High",
      impact: "High",
      urgency: "High",
      status: "Active",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5h ago
      slaLimit: 8,
      predictedTime: 2.2,
      slaRisk: 15,
      assignee: "Sarah Jenkins",
      description: "Production asset uploads failing with 403 Access Denied messages. CloudFront serving cached files correctly but backend updates are blocked.",
      rca: "IAM policy drift deleted s3:PutObject permission for the service deployment principal.",
      recommendation: "Re-apply IAM policy template JSON version v2.1.2 to restore write permission.",
      remediationAction: "Restore IAM S3 PutObject Policy",
      logs: [
        { time: "09:57 AM", text: "Incident created from support escalation dashboard." },
        { time: "09:58 AM", text: "AI Agent classified Category: Security, Priority: High." },
        { time: "09:58 AM", text: "Assigned to Sarah Jenkins (IAM policy expert)." }
      ]
    },
    {
      id: 103,
      title: "API Gateway response slowdown (504 Gateway Timeouts)",
      category: "Network",
      priority: "High",
      impact: "Medium",
      urgency: "High",
      status: "Active",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15m ago
      slaLimit: 8,
      predictedTime: 5.5,
      slaRisk: 68,
      assignee: null,
      description: "Ingress gateways are returning 504 timeouts to clients. Pod metrics indicate auth-service response times have crossed 8 seconds, backing up requests.",
      rca: "Authentication connection pool exhausted due to sudden login request spike.",
      recommendation: "Scale auth-service pods to 8 replicas and increase connection timeout limits on Nginx configs.",
      remediationAction: "Scale Pod Replicas",
      logs: [
        { time: "11:12 AM", text: "Incident created from telemetry alarm gateway_timeout_504." },
        { time: "11:13 AM", text: "Triage Agent classified Category: Network, Priority: High." },
        { time: "11:13 AM", text: "Unassigned. No network engineer currently available." }
      ]
    },
    {
      id: 104,
      title: "Billing cron scheduler failing on execution cycle",
      category: "Application",
      priority: "Medium",
      impact: "Low",
      urgency: "Medium",
      status: "Resolved",
      createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // 3h ago
      slaLimit: 24,
      predictedTime: 1.5,
      slaRisk: 0,
      assignee: "Bob Evans",
      description: "Cron job billing-scheduler failed to execute at 08:00 AM UTC. Transaction state logs show database deadlock error code 1213.",
      rca: "Deadlock in schema transactions locked the queue executor table lock.",
      recommendation: "Restart scheduling container, clear stale task locks, and rerun failed cycles.",
      remediationAction: "Restart Cron Executor",
      logs: [
        { time: "08:00 AM", text: "Failed cron job report registered." },
        { time: "08:02 AM", text: "Assigned to Bob Evans." },
        { time: "08:45 AM", text: "Bob Evans restarted cron service and cleared DB lock. Incident resolved." }
      ]
    },
    {
      id: 105,
      title: "Memory leak alert on user-auth-service NodeJS processes",
      category: "Application",
      priority: "Medium",
      impact: "Medium",
      urgency: "Low",
      status: "Active",
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2h ago
      slaLimit: 24,
      predictedTime: 16.5,
      slaRisk: 42,
      assignee: "Alice Wong",
      description: "Memory utilization on user-auth-service-pod-3 is at 94%. NodeJS heap snapshots show accumulation of closure references in event emitter callbacks.",
      rca: "Unsubscribed event listener bindings retaining connection buffers in memory heap.",
      recommendation: "Trigger a rolling deployment of patched service image version auth-v2.1.8 or run container restart.",
      remediationAction: "Perform Rolling Restart",
      logs: [
        { time: "09:27 AM", text: "Memory warning alert fired." },
        { time: "09:28 AM", text: "Assigned to Alice Wong based on Node expertise." }
      ]
    }
  ],

  engineers: [
    { name: "Dave Miller", skills: ["Database", "Infrastructure", "Network"], activeTickets: 1, capacity: 3, reliability: 96, avatar: "DM", status: "Active" },
    { name: "Sarah Jenkins", skills: ["Security", "Network", "Infrastructure"], activeTickets: 1, capacity: 2, reliability: 95, avatar: "SJ", status: "Active" },
    { name: "Alice Wong", skills: ["Application", "Security"], activeTickets: 1, capacity: 3, reliability: 94, avatar: "AW", status: "Active" },
    { name: "Bob Evans", skills: ["Application", "Database"], activeTickets: 0, capacity: 3, reliability: 88, avatar: "BE", status: "Active" },
    { name: "Charlie Brown", skills: ["Infrastructure", "Network"], activeTickets: 0, capacity: 4, reliability: 82, avatar: "CB", status: "Idle" },
    { name: "Diana Prince", skills: ["Security", "Application"], activeTickets: 0, capacity: 3, reliability: 97, avatar: "DP", status: "Active" },
    { name: "Ethan Hunt", skills: ["Security", "Network"], activeTickets: 0, capacity: 2, reliability: 99, avatar: "EH", status: "Active" },
    { name: "Fiona Gallagher", skills: ["Application", "Infrastructure"], activeTickets: 0, capacity: 3, reliability: 85, avatar: "FG", status: "Active" },
    { name: "George Clark", skills: ["Database", "Application"], activeTickets: 0, capacity: 4, reliability: 90, avatar: "GC", status: "Active" },
    { name: "Hannah Abbott", skills: ["Infrastructure", "Database"], activeTickets: 0, capacity: 3, reliability: 89, avatar: "HA", status: "Active" },
    { name: "Ian Malcolm", skills: ["Database", "Security"], activeTickets: 0, capacity: 3, reliability: 93, avatar: "IM", status: "Active" },
    { name: "Julia Roberts", skills: ["Application", "Network"], activeTickets: 0, capacity: 4, reliability: 91, avatar: "JR", status: "Active" },
    { name: "Kevin Mitnick", skills: ["Security", "Infrastructure"], activeTickets: 0, capacity: 2, reliability: 98, avatar: "KM", status: "Active" },
    { name: "Laura Croft", skills: ["Network", "Database"], activeTickets: 0, capacity: 3, reliability: 95, avatar: "LC", status: "Active" },
    { name: "Marcus Aurelius", skills: ["Infrastructure", "Security"], activeTickets: 0, capacity: 4, reliability: 92, avatar: "MA", status: "Active" },
    { name: "Nina Simone", skills: ["Application", "Database"], activeTickets: 0, capacity: 3, reliability: 87, avatar: "NS", status: "Active" },
    { name: "Oscar Wilde", skills: ["Network", "Application"], activeTickets: 0, capacity: 3, reliability: 86, avatar: "OW", status: "Active" },
    { name: "Penelope Cruz", skills: ["Security", "Network"], activeTickets: 0, capacity: 3, reliability: 94, avatar: "PC", status: "Active" },
    { name: "Quentin Tarantino", skills: ["Infrastructure", "Database"], activeTickets: 0, capacity: 4, reliability: 88, avatar: "QT", status: "Active" },
    { name: "Rachel Green", skills: ["Application", "Infrastructure"], activeTickets: 0, capacity: 3, reliability: 84, avatar: "RG", status: "Active" }
  ],

  // Mock Knowledge Base RAG documents
  kb: [
    {
      id: "kb-01",
      title: "Resolving checkout database latency & locking index errors",
      keywords: ["database", "checkout", "latency", "index", "lock", "checkout-prod"],
      remediation: "Run 'CREATE INDEX CONCURRENTLY IX_CHECKOUT_SEARCH ON orders(customer_id, checkout_status);' then execute query buffer flush.",
      rca: "Missing customer_id indexing combined with high frequency transactions causing scan logs locking.",
      category: "Database"
    },
    {
      id: "kb-02",
      title: "S3 403 Forbidden Access Denied policies fixes",
      keywords: ["s3", "permissions", "access denied", "iam", "bucket"],
      remediation: "Verify deployment JSON policy. Reapply the bucket IAM template: `aws iam update-assume-role-policy --role-name prod-uploader --policy-document file://policies/s3-put.json`",
      rca: "IAM deployment template overwriting S3 PutObject privileges during pipeline runs.",
      category: "Security"
    },
    {
      id: "kb-03",
      title: "API Gateway 504 Timeout container scaling guide",
      keywords: ["api gateway", "504", "timeout", "pods", "scale"],
      remediation: "Run Kubernetes auto-scale script: `kubectl scale deployment auth-service --replicas=8 -n production` and restart gateway route configurations.",
      rca: "Spike load saturating default maximum container replicas configurations.",
      category: "Network"
    },
    {
      id: "kb-04",
      title: "NodeJS Memory Leak and heap cleanup operations",
      keywords: ["memory leak", "heap", "nodejs", "restart", "eventemitter"],
      remediation: "Trigger rolling restart of application pod using: `kubectl rollout restart deployment user-auth-service`.",
      rca: "Callback listeners retaining HTTP connection stream pointers in NodeJS process buffers.",
      category: "Application"
    }
  ],

  // Logs for security auditing
  auditLogs: []
};

// State Modifiers
window.addIncident = function(title, description, category) {
  // 1. Classification Engine (Rules-based fallback matching LLM results)
  let severity = "Medium";
  let urgency = "Medium";
  let priority = "Medium";
  
  const descLower = (title + " " + description).toLowerCase();
  
  if (descLower.includes("latency") || descLower.includes("slow") || descLower.includes("timeout")) {
    urgency = "High";
  }
  if (descLower.includes("checkout") || descLower.includes("billing") || descLower.includes("customer") || descLower.includes("db") || descLower.includes("prod")) {
    severity = "High";
  }
  
  if (descLower.includes("outage") || descLower.includes("critical") || descLower.includes("down") || descLower.includes("crash")) {
    severity = "Critical";
    urgency = "Immediate";
  }
  
  // Scoring priority:
  let score = 20; // base
  if (severity === "Critical") score += 40;
  else if (severity === "High") score += 25;
  if (urgency === "Immediate") score += 30;
  else if (urgency === "High") score += 15;
  
  if (score >= 75) priority = "Critical";
  else if (score >= 50) priority = "High";
  else if (score >= 25) priority = "Medium";
  else priority = "Low";

  // SLA Calculation
  const slaLimits = { "Critical": 4, "High": 8, "Medium": 24, "Low": 48 };
  const slaLimit = slaLimits[priority] || 24;
  
  // SLA Predictor
  // Simulates that high-load times increase predicted resolution duration
  const activeUnresolvedCount = PulseState.incidents.filter(i => i.status === "Active").length;
  const baseMttrs = { "Database": 3.0, "Security": 2.0, "Network": 3.5, "Application": 2.5, "Infrastructure": 3.2 };
  const baseMttr = baseMttrs[category] || 2.5;
  const predictedTime = parseFloat((baseMttr * (1 + (activeUnresolvedCount * 0.15)) * (0.8 + Math.random() * 0.4)).toFixed(1));
  
  const rawRisk = (predictedTime / slaLimit) * 100;
  const slaRisk = Math.min(Math.round(rawRisk > 100 ? 90 + Math.random() * 9 : rawRisk), 99);

  // Resource Allocator
  // Matches based on Category, status, and workload
  let bestEngineerName = null;
  let highestScore = -1;
  
  PulseState.engineers.forEach(eng => {
    if (eng.status === "Active" || eng.status === "Idle") {
      let matchScore = 0;
      
      // Skill match
      if (eng.skills.includes(category)) matchScore += 50;
      
      // Workload capacity
      const loadFactor = (eng.capacity - eng.activeTickets) / eng.capacity;
      matchScore += loadFactor * 30;
      
      // Reliability rating
      matchScore += eng.reliability * 0.2;
      
      if (matchScore > highestScore) {
        highestScore = matchScore;
        bestEngineerName = eng.name;
      }
    }
  });

  // Knowledge Base Search (RAG Simulation)
  let recommendation = "Trigger standard application restart and inspect diagnostics logs.";
  let rca = "Undetermined system variation.";
  let remediationAction = "Restart Container Node";
  
  const matchedKb = PulseState.kb.find(k => k.category.toLowerCase() === category.toLowerCase()) || 
                    PulseState.kb.find(k => k.keywords.some(kw => descLower.includes(kw)));
  
  if (matchedKb) {
    recommendation = matchedKb.remediation;
    rca = matchedKb.rca;
    remediationAction = matchedKb.keywords[0] ? "Run " + matchedKb.keywords[0].toUpperCase() + " fix" : "Apply Patch";
  }

  const newId = 100 + PulseState.incidents.length + 1;
  const newIncident = {
    id: newId,
    title: title,
    category: category,
    priority: priority,
    impact: severity,
    urgency: urgency,
    status: "Active",
    createdAt: new Date().toISOString(),
    slaLimit: slaLimit,
    predictedTime: predictedTime,
    slaRisk: slaRisk,
    assignee: bestEngineerName,
    description: description,
    rca: rca,
    recommendation: recommendation,
    remediationAction: remediationAction,
    logs: [
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: "Incident ingested from cloud monitor alarm." },
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: `AI triage: Category=${category}, Priority=${priority}.` },
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: `SLA prediction: ${predictedTime}h. Breach Risk: ${slaRisk}%.` }
    ]
  };

  // Update State
  PulseState.incidents.unshift(newIncident);
  PulseState.systemMetrics.incidentsToday += 1;
  
  if (bestEngineerName) {
    const engineer = PulseState.engineers.find(e => e.name === bestEngineerName);
    if (engineer) {
      engineer.activeTickets += 1;
      newIncident.logs.push({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Intelligent routing matched ticket to ${bestEngineerName} (Score: ${Math.round(highestScore)}).`
      });
    }
  }

  // Trigger DOM updates
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent("pulse-state-changed", { detail: { type: "add", incident: newIncident } }));
  }
  
  return newIncident;
};

window.resolveIncident = function(id, notes) {
  const incident = PulseState.incidents.find(i => i.id === parseInt(id));
  if (incident && incident.status !== "Resolved") {
    incident.status = "Resolved";
    
    // Decrement engineer load
    if (incident.assignee) {
      const eng = PulseState.engineers.find(e => e.name === incident.assignee);
      if (eng && eng.activeTickets > 0) {
        eng.activeTickets -= 1;
      }
    }
    
    incident.logs.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Resolution applied. Notes: ${notes || "Auto-remediation executed successfully."}`
    });
    
    PulseState.systemMetrics.resolvedToday += 1;
    
    // Recalculate SLA compliance
    const resolvedOnTime = PulseState.incidents
      .filter(i => i.status === "Resolved")
      .length;
    PulseState.systemMetrics.slaCompliance = parseFloat((90 + (resolvedOnTime * 1.2)).toFixed(1));
    if (PulseState.systemMetrics.slaCompliance > 100) PulseState.systemMetrics.slaCompliance = 100;

    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("pulse-state-changed", { detail: { type: "resolve", incident: incident } }));
    }
    return true;
  }
  return false;
};

window.reassignIncident = function(id, engineerName) {
  const incident = PulseState.incidents.find(i => i.id === parseInt(id));
  if (incident) {
    const oldAssignee = incident.assignee;
    
    // Check if new assignee exists
    const newEng = PulseState.engineers.find(e => e.name === engineerName);
    if (!newEng) return false;
    
    // Remove load from old
    if (oldAssignee) {
      const oldEng = PulseState.engineers.find(e => e.name === oldAssignee);
      if (oldEng && oldEng.activeTickets > 0) {
        oldEng.activeTickets -= 1;
      }
    }
    
    // Add load to new
    incident.assignee = engineerName;
    newEng.activeTickets += 1;
    
    incident.logs.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Reassigned from ${oldAssignee || "Unassigned"} to ${engineerName} via controller.`
    });

    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("pulse-state-changed", { detail: { type: "reassign", incident: incident } }));
    }
    return true;
  }
  return false;
};
