// Real-time Event & Metrics Simulation for PulseOps AI
window.PulseScheduler = {
  intervalId: null,
  
  // List of incident templates to randomly trigger during operation
  templates: [
    {
      title: "Redis cluster cache eviction rate warning",
      category: "Infrastructure",
      description: "Redis caching nodes are report eviction rates exceeding 1500 keys/sec. Available cluster memory is dropping below 4% limits."
    },
    {
      title: "API endpoint /v1/checkout returning 500 server error responses",
      category: "Application",
      description: "App runtime reports database transaction deadlock errors on order save routines. 5% of checkout traffic is impacted."
    },
    {
      title: "Suspicious API access patterns detected from IP 198.51.100.42",
      category: "Security",
      description: "Rate limiter blocked 4,500 authentication attempts in a 3-minute window. Patterns indicate credential stuffing attacks."
    },
    {
      title: "VPC Transit Gateway packet loss degradation",
      category: "Network",
      description: "Inter-region network tunnels reports packet drop rates of 1.4%. BGP route recalculation has triggered routing hops."
    },
    {
      title: "Disk space exhaustion alert on log collector nodes",
      category: "Infrastructure",
      description: "Elasticsearch indexing node disk path volume is at 96% utilization. Indices allocation has been locked to read-only."
    }
  ],
  
  startSimulation: function() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.tickMetrics();
      this.tickIncidents();
      this.tickEngineerProgress();
    }, 12000); // Trigger ticks every 12 seconds
  },
  
  stopSimulation: function() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
  
  // Fluctuates system stats and updates scrolling queues
  tickMetrics: function() {
    if (PulseState.backendConnected) {
      fetch("http://localhost:8000/api/metrics/tick", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        PulseState.systemMetrics = data;
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent("pulse-telemetry-updated"));
        }
      })
      .catch(err => console.error("Error ticking backend metrics:", err));
      return;
    }
    
    const metrics = PulseState.systemMetrics;
    
    // Simulate cpu fluctuations
    let cpuDiff = Math.round((Math.random() - 0.5) * 8);
    // If db latency is high, push CPU higher
    if (metrics.dbLatency > 80) cpuDiff += 4;
    metrics.cpu = Math.max(10, Math.min(98, metrics.cpu + cpuDiff));
    
    // Scroll CPU Queue
    metrics.cpuHistory.push(metrics.cpu);
    metrics.cpuHistory.shift();
    
    // Simulate db latency fluctuations
    let latencyDiff = Math.round((Math.random() - 0.5) * 12);
    metrics.dbLatency = Math.max(15, Math.min(220, metrics.dbLatency + latencyDiff));
    
    // Scroll Latency Queue
    metrics.latencyHistory.push(metrics.dbLatency);
    metrics.latencyHistory.shift();
    
    // Adjust error rates based on CPU
    metrics.errorRate = parseFloat((Math.max(0.1, (metrics.cpu / 50) + (Math.random() * 0.5))).toFixed(1));
    
    // Dispatch telemetry update event
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("pulse-telemetry-updated"));
    }
  },
  
  // Randomly ingest new incidents
  tickIncidents: function() {
    // 20% chance to generate incident per tick
    if (Math.random() > 0.2) return;
    
    const template = this.templates[Math.floor(Math.random() * this.templates.length)];
    
    // Don't duplicate active titles
    const isDuplicate = PulseState.incidents.some(i => i.title === template.title && i.status === "Active");
    if (isDuplicate) return;
    
    // Trigger State Add
    window.addIncident(template.title, template.description, template.category);
  },
  
  // Simulates active engineers closing down low/medium risk incidents over time
  tickEngineerProgress: function() {
    PulseState.incidents.forEach(inc => {
      if (inc.status === "Active" && inc.assignee) {
        // Lower priority tickets resolve faster in mock environment
        let resolveChance = 0.08;
        if (inc.priority === "Low") resolveChance = 0.20;
        else if (inc.priority === "Medium") resolveChance = 0.12;
        
        if (Math.random() < resolveChance) {
          window.resolveIncident(inc.id, "Resolved via automated resolution loop matching engineer progress.");
        }
      }
    });
  }
};
