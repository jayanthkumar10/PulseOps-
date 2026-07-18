// High-fidelity Custom Graphic Utilities for PulseOps AI
window.PulseCharts = {
  
  // Renders a premium SVG line chart showing MTTR trends over 7 days
  drawMTTRChart: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = "";
    
    const width = container.clientWidth || 360;
    const height = 180;
    const padding = 30;
    
    const data = [120, 105, 95, 78, 62, 48, 32]; // MTTR in minutes
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    const maxVal = 140;
    const minVal = 0;
    
    const points = data.map((val, index) => {
      const x = padding + (index * (width - 2 * padding) / (data.length - 1));
      const y = height - padding - ((val - minVal) * (height - 2 * padding) / (maxVal - minVal));
      return { x, y, val, day: days[index] };
    });
    
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
    
    let areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    
    let gridLines = "";
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (height - 2 * padding) / 4);
      const valLabel = Math.round(maxVal - (i * maxVal / 4));
      gridLines += `
        <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#1F2937" stroke-dasharray="4,4" />
        <text x="${padding - 8}" y="${y + 4}" fill="#6B7280" font-size="10" text-anchor="end" font-weight="600">${valLabel}m</text>
      `;
    }
    
    let pointsHtml = "";
    points.forEach(p => {
      pointsHtml += `
        <g class="chart-point-group" style="cursor: pointer;">
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#8b5cf6" stroke="#0A0F1C" stroke-width="2" />
          <circle class="hover-ring" cx="${p.x}" cy="${p.y}" r="8" fill="none" stroke="#8b5cf6" stroke-width="2" opacity="0" style="transition: opacity 0.15s ease;" />
          <text x="${p.x}" y="${height - 10}" fill="#9CA3AF" font-size="10" text-anchor="middle" font-weight="600">${p.day}</text>
        </g>
      `;
    });

    const svg = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaD}" fill="url(#chartGradient)" />
        <path d="${pathD}" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" />
        ${pointsHtml}
      </svg>
    `;
    
    container.innerHTML = svg;
    
    // Add simple tooltip hooks
    const groups = container.querySelectorAll(".chart-point-group");
    groups.forEach((g, idx) => {
      g.addEventListener("mouseenter", (e) => {
        g.querySelector(".hover-ring").setAttribute("opacity", "0.4");
        showTooltip(e, `${points[idx].day}: MTTR ${points[idx].val} mins`);
      });
      g.addEventListener("mouseleave", () => {
        g.querySelector(".hover-ring").setAttribute("opacity", "0");
        hideTooltip();
      });
    });
  },
  
  // Renders a glassmorphic SVG Doughnut chart showing incident category distributions
  drawCategoryPie: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = "";
    const size = 180;
    const center = size / 2;
    const radius = 60;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    
    // Process categories counts from state
    const counts = {};
    let total = 0;
    PulseState.incidents.forEach(inc => {
      counts[inc.category] = (counts[inc.category] || 0) + 1;
      total++;
    });
    
    const categories = Object.keys(counts).map(key => ({
      name: key,
      count: counts[key],
      percent: (counts[key] / total) * 100
    }));
    
    // Colors mapping
    const catColors = {
      "Database": "#EF4444",      // Danger
      "Security": "#10B981",      // Success
      "Network": "#F59E0B",       // Warning
      "Application": "#8b5cf6",   // Info
      "Infrastructure": "#06B6D4" // Secondary
    };
    
    let accumulatedOffset = 0;
    let circlesHtml = "";
    
    categories.forEach((cat, index) => {
      const color = catColors[cat.name] || "#9CA3AF";
      const strokeDashoffset = circumference - (cat.percent / 100) * circumference;
      const rotation = (accumulatedOffset / circumference) * 360 - 90;
      
      circlesHtml += `
        <circle cx="${center}" cy="${center}" r="${radius}"
                fill="transparent"
                stroke="${color}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${strokeDashoffset}"
                transform="rotate(${rotation} ${center} ${center})"
                style="transition: stroke-dashoffset 0.5s ease; cursor: pointer;"
                class="pie-slice"
                data-name="${cat.name}"
                data-count="${cat.count}" />
      `;
      accumulatedOffset += (cat.percent / 100) * circumference;
    });

    const svg = `
      <div class="pie-chart-wrapper">
        <svg width="${size}" height="${size}">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="#1F2937" stroke-width="${strokeWidth}" />
          ${circlesHtml}
          <text x="${center}" y="${center + 4}" fill="#F8FAFC" font-size="16" font-weight="800" text-anchor="middle">${total}</text>
          <text x="${center}" y="${center + 18}" fill="#6B7280" font-size="9" font-weight="600" text-anchor="middle" letter-spacing="1">TOTAL</text>
        </svg>
        <div class="pie-chart-legend">
          ${categories.map(cat => {
            const color = catColors[cat.name] || "#9CA3AF";
            return `
              <div class="pie-legend-item">
                <span class="pie-legend-dot" style="background-color: ${color};"></span>
                <span class="pie-legend-name">${cat.name}</span>
                <span class="pie-legend-count">${cat.count}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    container.innerHTML = svg;
    
    // Hover tooltips on slices
    const slices = container.querySelectorAll(".pie-slice");
    slices.forEach(s => {
      s.addEventListener("mouseenter", (e) => {
        s.setAttribute("stroke-width", strokeWidth + 3);
        showTooltip(e, `${s.getAttribute("data-name")}: ${s.getAttribute("data-count")} Incidents`);
      });
      s.addEventListener("mouseleave", () => {
        s.setAttribute("stroke-width", strokeWidth);
        hideTooltip();
      });
    });
  },
  
  // Real-time scrolling metrics graph rendered on Canvas for High FPS
  drawSystemMetrics: function(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    
    // Scale for HighDPI screens
    const width = parent.clientWidth || 300;
    const height = parent.clientHeight || 150;
    
    canvas.width = width;
    canvas.height = height;
    
    const cpuData = PulseState.systemMetrics.cpuHistory;
    const latencyData = PulseState.systemMetrics.latencyHistory;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw background grid lines
    ctx.strokeStyle = "#1F2937";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw CPU Line (Electric Blue)
    drawChartLine(ctx, cpuData, width, height, "#8b5cf6", "rgba(139, 92, 246, 0.05)");
    
    // Draw Latency Line (Teal/Cyan)
    drawChartLine(ctx, latencyData, width, height, "#06B6D4", "rgba(6, 182, 212, 0.05)");
  }
};

function drawChartLine(ctx, data, width, height, color, fillColor) {
  const padding = 10;
  const maxVal = 100;
  const step = width / (data.length - 1);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  data.forEach((val, idx) => {
    const x = idx * step;
    const y = height - padding - (val * (height - 2 * padding) / maxVal);
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  
  // Area fill
  ctx.lineTo((data.length - 1) * step, height);
  ctx.lineTo(0, height);
  ctx.fillStyle = fillColor;
  ctx.fill();
}

// Tooltip Helpers
let tooltipNode = null;
function showTooltip(e, text) {
  if (!tooltipNode) {
    tooltipNode = document.createElement("div");
    tooltipNode.className = "chart-tooltip";
    document.body.appendChild(tooltipNode);
  }
  tooltipNode.innerText = text;
  tooltipNode.style.opacity = "1";
  
  // Position
  const x = e.clientX + 10;
  const y = e.clientY - 30;
  tooltipNode.style.left = `${x}px`;
  tooltipNode.style.top = `${y}px`;
}

function hideTooltip() {
  if (tooltipNode) {
    tooltipNode.style.opacity = "0";
  }
}
