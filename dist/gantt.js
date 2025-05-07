export class GanttChart {
    constructor(containerId, tasks, config) {
        this.width = 1000; // Base width, adjusted dynamically
        this.height = 400; // Adjusted dynamically
        this.margin = { top: 60, right: 20, bottom: 20, left: 250 }; // Increased left margin for table
        const container = document.getElementById(containerId);
        if (!container)
            throw new Error(`Container with ID ${containerId} not found`);
        // Create wrapper for the entire component
        this.chartContainer = document.createElement("div");
        this.chartContainer.className = "gantt-wrapper";
        container.appendChild(this.chartContainer);
        // Create table container
        this.tableContainer = document.createElement("div");
        this.tableContainer.className = "gantt-table-container";
        this.chartContainer.appendChild(this.tableContainer);
        // Create SVG container
        const svgContainer = document.createElement("div");
        svgContainer.className = "gantt-svg-container";
        this.chartContainer.appendChild(svgContainer);
        // Compute dynamic dimensions
        const containerRect = container.getBoundingClientRect();
        this.width = containerRect.width || this.width;
        this.height = Math.max(400, tasks.length * 40 + 100); // Adjust height based on tasks
        this.scrollableWidth = (this.width * (config.timelineMonths || 12)) / 3; // Approx 3 months per width
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", this.scrollableWidth.toString());
        this.svg.setAttribute("height", this.height.toString());
        this.svg.setAttribute("viewBox", `0 0 ${this.scrollableWidth} ${this.height}`);
        svgContainer.appendChild(this.svg);
        // Add SVG definitions for gradients
        this.addSvgDefs();
        this.tasks = tasks;
        this.config = Object.assign({ timelineMonths: 12, showTaskList: true, colors: {
                1: "#3b82f6", // Blue
                2: "#ec4899", // Pink
                3: "#10b981", // Green
                4: "#f59e0b", // Amber
                5: "#8b5cf6", // Purple
            } }, config);
        this.render();
    }
    addSvgDefs() {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        // Create gradients for each priority level (1-5)
        const priorities = [1, 2, 3, 4, 5];
        const colors = {
            1: "#3b82f6", // Blue
            2: "#ec4899", // Pink
            3: "#10b981", // Green
            4: "#f59e0b", // Amber
            5: "#8b5cf6", // Purple
        };
        priorities.forEach((priority) => {
            const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradient.setAttribute("id", `gradient-${priority}`);
            gradient.setAttribute("x1", "0%");
            gradient.setAttribute("y1", "0%");
            gradient.setAttribute("x2", "100%");
            gradient.setAttribute("y2", "0%");
            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute("offset", "0%");
            stop1.setAttribute("stop-color", colors[priority]);
            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute("offset", "100%");
            stop2.setAttribute("stop-color", this.lightenColor(colors[priority], 20));
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
        });
        this.svg.appendChild(defs);
    }
    lightenColor(color, percent) {
        // Convert hex to RGB
        const hex = color.replace("#", "");
        const r = Number.parseInt(hex.substring(0, 2), 16);
        const g = Number.parseInt(hex.substring(2, 4), 16);
        const b = Number.parseInt(hex.substring(4, 6), 16);
        // Lighten
        const lightenR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
        const lightenG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
        const lightenB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
        // Convert back to hex
        return `#${lightenR.toString(16).padStart(2, "0")}${lightenG.toString(16).padStart(2, "0")}${lightenB.toString(16).padStart(2, "0")}`;
    }
    render() {
        // Create tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        document.body.appendChild(tooltip);
        // Group tasks by priority (main group)
        const tasksByPriorityGroup = {};
        this.tasks.forEach((task) => {
            const mainPriority = Math.floor(task.priority);
            if (!tasksByPriorityGroup[mainPriority]) {
                tasksByPriorityGroup[mainPriority] = [];
            }
            tasksByPriorityGroup[mainPriority].push(task);
        });
        // Sort tasks within each priority group by their decimal part
        Object.keys(tasksByPriorityGroup).forEach((priority) => {
            tasksByPriorityGroup[Number(priority)].sort((a, b) => a.priority - b.priority);
        });
        // Calculate date range
        const timestamps = this.tasks.flatMap((t) => [
            new Date(t.start).getTime(),
            new Date(t.end).getTime(),
        ]);
        const minDate = new Date(Math.min(...timestamps));
        minDate.setDate(minDate.getDate() - 15); // Buffer: 15 days before
        const maxDate = new Date(Math.max(...timestamps));
        maxDate.setDate(maxDate.getDate() + 15); // Buffer: 15 days after
        // Ensure we have at least the configured number of months
        const currentRange = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (currentRange < (this.config.timelineMonths || 12)) {
            maxDate.setMonth(minDate.getMonth() + (this.config.timelineMonths || 12));
        }
        // X-scale for timeline
        const xScale = (date) => {
            return (this.margin.left +
                ((date.getTime() - minDate.getTime()) /
                    (maxDate.getTime() - minDate.getTime())) *
                    (this.scrollableWidth - this.margin.left - this.margin.right));
        };
        // Create table header
        const tableHeader = document.createElement("div");
        tableHeader.className = "gantt-table-header";
        tableHeader.innerHTML = `
      <div class="gantt-table-cell header">Priority</div>
      <div class="gantt-table-cell header">Task</div>
    `;
        this.tableContainer.appendChild(tableHeader);
        // Render background grid
        const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const days = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
        const interval = Math.ceil(days / 20); // Approx 20 intervals
        // Add month labels at the top
        const monthLabels = document.createElementNS("http://www.w3.org/2000/svg", "g");
        monthLabels.setAttribute("class", "month-labels");
        const currentMonth = new Date(minDate);
        currentMonth.setDate(1); // Start at the beginning of the month
        while (currentMonth <= maxDate) {
            const x = xScale(currentMonth);
            const monthLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            monthLabel.setAttribute("x", x.toString());
            monthLabel.setAttribute("y", (this.margin.top - 35).toString());
            monthLabel.setAttribute("text-anchor", "middle");
            monthLabel.setAttribute("class", "month-label");
            monthLabel.textContent = currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });
            monthLabels.appendChild(monthLabel);
            // Add month separator line
            const monthLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            monthLine.setAttribute("x1", x.toString());
            monthLine.setAttribute("x2", x.toString());
            monthLine.setAttribute("y1", (this.margin.top - 10).toString());
            monthLine.setAttribute("y2", (this.height - this.margin.bottom).toString());
            monthLine.setAttribute("class", "month-line");
            grid.appendChild(monthLine);
            // Move to next month
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        this.svg.appendChild(monthLabels);
        // Add day grid lines
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + interval)) {
            const x = xScale(d);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x.toString());
            line.setAttribute("x2", x.toString());
            line.setAttribute("y1", (this.margin.top - 10).toString());
            line.setAttribute("y2", (this.height - this.margin.bottom).toString());
            line.setAttribute("class", "grid-line");
            grid.appendChild(line);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x.toString());
            text.setAttribute("y", (this.margin.top - 15).toString());
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("class", "date-label");
            text.textContent = d.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
            });
            grid.appendChild(text);
        }
        this.svg.appendChild(grid);
        // Render timeline
        const timeline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        timeline.setAttribute("x1", this.margin.left.toString());
        timeline.setAttribute("x2", (this.scrollableWidth - this.margin.right).toString());
        timeline.setAttribute("y1", (this.margin.top - 10).toString());
        timeline.setAttribute("y2", (this.margin.top - 10).toString());
        timeline.setAttribute("class", "timeline");
        this.svg.appendChild(timeline);
        // Render tasks by priority group
        let yOffset = this.margin.top;
        const priorityGroups = Object.keys(tasksByPriorityGroup).map(Number).sort();
        priorityGroups.forEach((priorityGroup, pIndex) => {
            const taskGroup = tasksByPriorityGroup[priorityGroup];
            // Add priority group header
            const groupHeader = document.createElementNS("http://www.w3.org/2000/svg", "text");
            groupHeader.setAttribute("x", "10");
            groupHeader.setAttribute("y", (yOffset - 5).toString());
            groupHeader.setAttribute("class", "priority-group-header");
            groupHeader.textContent = `Priority ${priorityGroup}`;
            this.svg.appendChild(groupHeader);
            // Add table rows for this priority group
            taskGroup.forEach((task, i) => {
                const y = yOffset + i * 40;
                // Add table row
                const tableRow = document.createElement("div");
                tableRow.className = "gantt-table-row";
                tableRow.innerHTML = `
          <div class="gantt-table-cell priority-cell">
            <span class="priority-badge" style="background: ${this.getPriorityColor(task.priority)}">
              ${task.priority.toFixed(1)}
            </span>
          </div>
          <div class="gantt-table-cell">${task.name}</div>
        `;
                this.tableContainer.appendChild(tableRow);
                const startX = xScale(new Date(task.start));
                const endX = xScale(new Date(task.end));
                const barWidth = Math.max(endX - startX, 10); // Minimum width
                // Task bar
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", startX.toString());
                rect.setAttribute("y", y.toString());
                rect.setAttribute("width", barWidth.toString());
                rect.setAttribute("height", "30");
                rect.setAttribute("class", `task priority-${Math.floor(task.priority)}`);
                rect.setAttribute("rx", "6"); // Rounded corners
                // Generate tooltip content
                let tooltipContent = `<div class="tooltip-header" style="background: ${this.getPriorityColor(task.priority)}">
          <span class="tooltip-priority">Priority ${task.priority.toFixed(1)}</span>
          <span class="tooltip-title">${task.name}</span>
        </div>
        <div class="tooltip-content">`;
                // Add configured fields to tooltip
                this.config.tooltipFields.forEach((field) => {
                    if (field !== "task_list") {
                        tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">${String(field)}:</span> <span class="tooltip-value">${task[field]}</span></div>`;
                    }
                });
                // Add task list if configured and available
                if (this.config.showTaskList &&
                    task.task_list &&
                    task.task_list.length > 0) {
                    tooltipContent += `<div class="tooltip-section">
            <div class="tooltip-section-header">Task List:</div>
            <ul class="tooltip-task-list">
              ${task.task_list.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>`;
                }
                tooltipContent += "</div>";
                rect.setAttribute("data-tooltip", tooltipContent);
                this.svg.appendChild(rect);
                // Task progress indicator (decorative element)
                const progressWidth = barWidth * 0.7; // Just a visual element, not functional
                const progress = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                progress.setAttribute("x", startX.toString());
                progress.setAttribute("y", y.toString());
                progress.setAttribute("width", progressWidth.toString());
                progress.setAttribute("height", "30");
                progress.setAttribute("class", "task-progress");
                progress.setAttribute("rx", "6");
                progress.setAttribute("opacity", "0.3");
                this.svg.appendChild(progress);
                // Task name on bar
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", (startX + 10).toString());
                text.setAttribute("y", (y + 19).toString());
                text.setAttribute("class", "task-name");
                // Truncate text if too long for the bar
                const name = task.name;
                const maxTextLength = Math.floor(barWidth / 8); // Approximate characters that fit
                text.textContent =
                    name.length > maxTextLength
                        ? name.substring(0, maxTextLength - 3) + "..."
                        : name;
                this.svg.appendChild(text);
                // Date range indicator
                const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                dateText.setAttribute("x", (startX + barWidth - 5).toString());
                dateText.setAttribute("y", (y + 19).toString());
                dateText.setAttribute("text-anchor", "end");
                dateText.setAttribute("class", "date-range");
                // Only show date range if there's enough space
                if (barWidth > 150) {
                    const startDate = new Date(task.start).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    });
                    const endDate = new Date(task.end).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    });
                    dateText.textContent = `${startDate} - ${endDate}`;
                    this.svg.appendChild(dateText);
                }
            });
            yOffset += taskGroup.length * 40 + 30;
            // Priority group separator
            if (pIndex < priorityGroups.length - 1) {
                const separator = document.createElementNS("http://www.w3.org/2000/svg", "line");
                separator.setAttribute("x1", "0");
                separator.setAttribute("x2", this.scrollableWidth.toString());
                separator.setAttribute("y1", (yOffset - 15).toString());
                separator.setAttribute("y2", (yOffset - 15).toString());
                separator.setAttribute("class", "separator");
                this.svg.appendChild(separator);
                // Add separator to table as well
                const tableSeparator = document.createElement("div");
                tableSeparator.className = "gantt-table-separator";
                this.tableContainer.appendChild(tableSeparator);
            }
        });
        // Adjust SVG height based on content
        this.svg.setAttribute("height", (yOffset + 20).toString());
        this.svg.setAttribute("viewBox", `0 0 ${this.scrollableWidth} ${yOffset + 20}`);
        // Tooltip handling with scroll adjustment
        this.svg.addEventListener("mousemove", (e) => {
            const target = e.target;
            if (target.classList.contains("task")) {
                const rect = target.getBoundingClientRect();
                tooltip.style.display = "block";
                tooltip.innerHTML = target.getAttribute("data-tooltip") || "";
                tooltip.style.left = `${e.clientX + 10}px`; // Use clientX for scroll-adjusted position
                tooltip.style.top = `${e.clientY + 10}px`; // Use clientY
                tooltip.classList.add("visible");
            }
            else {
                tooltip.classList.remove("visible");
            }
        });
        this.svg.addEventListener("mouseleave", () => {
            tooltip.classList.remove("visible");
        });
        // Synchronize scrolling between table and chart
        const svgContainer = this.chartContainer.querySelector(".gantt-svg-container");
        svgContainer.addEventListener("scroll", () => {
            this.tableContainer.scrollTop = svgContainer.scrollTop;
        });
        this.tableContainer.addEventListener("scroll", () => {
            svgContainer.scrollTop = this.tableContainer.scrollTop;
        });
    }
    getPriorityColor(priority) {
        const mainPriority = Math.floor(priority);
        const colors = this.config.colors || {};
        return colors[mainPriority.toString()] || "#3b82f6"; // Default to blue
    }
}
