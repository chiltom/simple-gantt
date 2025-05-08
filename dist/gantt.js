export class GanttChart {
    constructor(containerId, tasks, config) {
        this.width = 1000; // Base width, adjusted dynamically
        this.height = 400; // Adjusted dynamically
        this.margin = { top: 60, right: 20, bottom: 20, left: 250 }; // Increased left margin for table
        this.zoomLevel = 1;
        this.isDragging = false;
        this.dragStartX = 0;
        this.viewBox = { x: 0, y: 0, width: 0, height: 0 };
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
        this.svgContainer = document.createElement("div");
        this.svgContainer.className = "gantt-svg-container";
        this.chartContainer.appendChild(this.svgContainer);
        // Create controls container
        const controlsContainer = document.createElement("div");
        controlsContainer.className = "gantt-controls";
        container.appendChild(controlsContainer);
        // Add zoom controls
        const zoomControls = document.createElement("div");
        zoomControls.className = "zoom-controls";
        zoomControls.innerHTML = `
      <button class="zoom-btn zoom-in" title="Zoom In">+</button>
      <span class="zoom-level">100%</span>
      <button class="zoom-btn zoom-out" title="Zoom Out">-</button>
      <button class="zoom-btn zoom-reset" title="Reset Zoom">Reset</button>
    `;
        controlsContainer.appendChild(zoomControls);
        // Add event listeners for zoom buttons
        const zoomInBtn = zoomControls.querySelector(".zoom-in");
        const zoomOutBtn = zoomControls.querySelector(".zoom-out");
        const zoomResetBtn = zoomControls.querySelector(".zoom-reset");
        const zoomLevelDisplay = zoomControls.querySelector(".zoom-level");
        zoomInBtn.addEventListener("click", () => this.zoom(0.2));
        zoomOutBtn.addEventListener("click", () => this.zoom(-0.2));
        zoomResetBtn.addEventListener("click", () => this.resetZoom());
        // Compute dynamic dimensions
        const containerRect = container.getBoundingClientRect();
        this.width = containerRect.width || this.width;
        this.height = Math.max(400, tasks.length * 40 + 100); // Adjust height based on tasks
        this.scrollableWidth = (this.width * (config.timelineMonths || 12)) / 3; // Approx 3 months per width
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", this.height.toString());
        // Create a group for all content that will be transformed
        this.svgContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.svg.appendChild(this.svgContent);
        this.svgContainer.appendChild(this.svg);
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
        // Create tooltip
        this.tooltip = document.createElement("div");
        this.tooltip.className = "tooltip";
        document.body.appendChild(this.tooltip);
        // Calculate date range
        const timestamps = this.tasks.flatMap((t) => [
            new Date(t.start).getTime(),
            new Date(t.end).getTime(),
        ]);
        this.taskMinDate = new Date(Math.min(...timestamps));
        this.taskMaxDate = new Date(Math.max(...timestamps));
        // Add buffer to min/max dates
        this.minDate = new Date(this.taskMinDate);
        this.minDate.setDate(this.minDate.getDate() - 15); // Buffer: 15 days before
        this.maxDate = new Date(this.taskMaxDate);
        this.maxDate.setDate(this.maxDate.getDate() + 15); // Buffer: 15 days after
        // Store initial date range for scaling calculations
        this.initialDateRange = this.maxDate.getTime() - this.minDate.getTime();
        // Ensure we have at least the configured number of months
        const currentRange = (this.maxDate.getTime() - this.minDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30);
        if (currentRange < (this.config.timelineMonths || 12)) {
            this.maxDate.setMonth(this.minDate.getMonth() + (this.config.timelineMonths || 12));
            this.initialDateRange = this.maxDate.getTime() - this.minDate.getTime();
        }
        // Set initial viewBox
        this.viewBox = {
            x: 0,
            y: 0,
            width: this.scrollableWidth,
            height: this.height,
        };
        this.updateViewBox();
        // Add pan event listeners
        this.setupPanEvents();
        // Add wheel zoom event listener
        this.svgContainer.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            // Get mouse position relative to SVG
            const svgRect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - svgRect.left;
            const mouseY = e.clientY - svgRect.top;
            // Convert to SVG coordinates
            const svgPoint = this.svg.createSVGPoint();
            svgPoint.x = mouseX;
            svgPoint.y = mouseY;
            // Zoom at mouse position
            this.zoomAtPoint(delta, svgPoint);
            // Update zoom level display
            const zoomLevelDisplay = document.querySelector(".zoom-level");
            if (zoomLevelDisplay) {
                zoomLevelDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            }
        }, { passive: false });
        this.render();
    }
    setupPanEvents() {
        let lastX = 0;
        let lastY = 0;
        const onMouseDown = (e) => {
            // Only start dragging on left mouse button
            if (e.button !== 0)
                return;
            this.isDragging = true;
            this.dragStartX = e.clientX;
            lastX = e.clientX;
            lastY = e.clientY;
            this.svgContainer.style.cursor = "grabbing";
            e.preventDefault();
        };
        const onMouseMove = (e) => {
            if (!this.isDragging)
                return;
            const dx = (e.clientX - lastX) / this.zoomLevel;
            const dy = (e.clientY - lastY) / this.zoomLevel;
            this.viewBox.x -= dx;
            this.viewBox.y -= dy;
            // Constrain panning to prevent going too far
            const maxX = this.scrollableWidth - this.viewBox.width;
            this.viewBox.x = Math.max(0, Math.min(this.viewBox.x, maxX));
            this.viewBox.y = Math.max(0, Math.min(this.viewBox.y, this.height - this.viewBox.height));
            this.updateViewBox();
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
        };
        const onMouseUp = () => {
            this.isDragging = false;
            this.svgContainer.style.cursor = "grab";
        };
        // Add event listeners
        this.svgContainer.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        // Set initial cursor
        this.svgContainer.style.cursor = "grab";
    }
    updateViewBox() {
        this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    }
    zoom(delta) {
        // Get the center point of the current view
        const centerX = this.viewBox.x + this.viewBox.width / 2;
        const centerY = this.viewBox.y + this.viewBox.height / 2;
        // Create an SVG point at the center
        const centerPoint = this.svg.createSVGPoint();
        centerPoint.x = centerX;
        centerPoint.y = centerY;
        // Zoom at the center point
        this.zoomAtPoint(delta, centerPoint);
        // Update zoom level display
        const zoomLevelDisplay = document.querySelector(".zoom-level");
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }
    zoomAtPoint(delta, point) {
        // Calculate new zoom level
        const newZoomLevel = Math.max(0.5, Math.min(5, this.zoomLevel + delta));
        // If zoom level hasn't changed, return
        if (newZoomLevel === this.zoomLevel)
            return;
        // Calculate point position relative to viewBox
        const pointRelX = (point.x - this.viewBox.x) / this.viewBox.width;
        const pointRelY = (point.y - this.viewBox.y) / this.viewBox.height;
        // Calculate new viewBox dimensions
        const zoomRatio = this.zoomLevel / newZoomLevel;
        const newWidth = this.viewBox.width * zoomRatio;
        const newHeight = this.viewBox.height * zoomRatio;
        // Calculate new viewBox position to keep the point at the same relative position
        const newX = point.x - pointRelX * newWidth;
        const newY = point.y - pointRelY * newHeight;
        // Update viewBox
        this.viewBox = {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
        };
        // Constrain panning to prevent going too far
        const maxX = this.scrollableWidth - this.viewBox.width;
        this.viewBox.x = Math.max(0, Math.min(this.viewBox.x, maxX));
        this.viewBox.y = Math.max(0, Math.min(this.viewBox.y, this.height - this.viewBox.height));
        this.updateViewBox();
        // Update zoom level
        this.zoomLevel = newZoomLevel;
        // Re-render the chart to update time scale and bar sizes
        this.render();
    }
    resetZoom() {
        this.zoomLevel = 1;
        // Reset viewBox to show the entire chart
        this.viewBox = {
            x: 0,
            y: 0,
            width: this.scrollableWidth,
            height: this.height,
        };
        this.updateViewBox();
        // Update zoom level display
        const zoomLevelDisplay = document.querySelector(".zoom-level");
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
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
        // Clear existing content
        while (this.svgContent.firstChild) {
            this.svgContent.removeChild(this.svgContent.firstChild);
        }
        this.tableContainer.innerHTML = "";
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
        // Calculate visible date range based on zoom level and current view position
        const currentDateRange = this.initialDateRange / this.zoomLevel;
        // Calculate the center of the current view in terms of date
        const viewCenterX = this.viewBox.x + this.viewBox.width / 2;
        const totalWidth = this.scrollableWidth - this.margin.left - this.margin.right;
        const viewCenterRatio = Math.max(0, Math.min(1, (viewCenterX - this.margin.left) / totalWidth));
        const viewCenterTime = this.minDate.getTime() +
            viewCenterRatio * (this.maxDate.getTime() - this.minDate.getTime());
        // Calculate adjusted date range centered on the current view
        const halfRange = currentDateRange / 2;
        let adjustedMinDate = new Date(viewCenterTime - halfRange);
        let adjustedMaxDate = new Date(viewCenterTime + halfRange);
        // Ensure all tasks are visible when zoomed out
        if (this.zoomLevel <= 1) {
            // Make sure the adjusted range includes all tasks
            if (adjustedMinDate > this.taskMinDate) {
                adjustedMinDate = new Date(this.taskMinDate);
            }
            if (adjustedMaxDate < this.taskMaxDate) {
                adjustedMaxDate = new Date(this.taskMaxDate);
            }
        }
        // X-scale for timeline - maps dates to x coordinates
        const xScale = (date) => {
            return (this.margin.left +
                ((date.getTime() - adjustedMinDate.getTime()) /
                    (adjustedMaxDate.getTime() - adjustedMinDate.getTime())) *
                    totalWidth);
        };
        // Create table header
        const tableHeader = document.createElement("div");
        tableHeader.className = "gantt-table-header";
        tableHeader.innerHTML = `
      <div class="gantt-table-cell header priority-header">Priority</div>
      <div class="gantt-table-cell header">Task</div>
    `;
        this.tableContainer.appendChild(tableHeader);
        // Render background grid
        const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
        grid.setAttribute("class", "grid");
        // Determine appropriate time scale based on zoom level and available space
        const availableWidth = this.scrollableWidth - this.margin.left - this.margin.right;
        const daysInRange = (adjustedMaxDate.getTime() - adjustedMinDate.getTime()) /
            (1000 * 60 * 60 * 24);
        const pixelsPerDay = availableWidth / daysInRange;
        // Calculate how many days to skip between labels to prevent overlap
        // Assuming each label needs at least 80px of space
        const daysToSkip = Math.max(1, Math.ceil(80 / pixelsPerDay));
        // Choose time interval based on days to skip
        let timeInterval;
        if (daysToSkip >= 60) {
            // Show only months
            timeInterval = {
                unit: "month",
                interval: 1,
                format: { month: "short", year: "numeric" },
            };
        }
        else if (daysToSkip >= 28) {
            // Show months
            timeInterval = {
                unit: "month",
                interval: 1,
                format: { month: "short" },
            };
        }
        else if (daysToSkip >= 7) {
            // Show weeks
            timeInterval = {
                unit: "day",
                interval: 7,
                format: { day: "numeric", month: "short" },
            };
        }
        else if (daysToSkip > 1) {
            // Show days with interval
            timeInterval = {
                unit: "day",
                interval: daysToSkip,
                format: { day: "numeric", month: "short" },
            };
        }
        else if (pixelsPerDay >= 50) {
            // Show days
            timeInterval = {
                unit: "day",
                interval: 1,
                format: { day: "numeric", month: "short" },
            };
        }
        else {
            // Default
            timeInterval = {
                unit: "day",
                interval: 1,
                format: { day: "numeric", month: "short" },
            };
        }
        // Add month labels at the top
        const monthLabels = document.createElementNS("http://www.w3.org/2000/svg", "g");
        monthLabels.setAttribute("class", "month-labels");
        // Add appropriate time scale labels based on zoom level
        if (timeInterval.unit === "month") {
            // Month labels
            const currentMonth = new Date(adjustedMinDate);
            currentMonth.setDate(1); // Start at the beginning of the month
            while (currentMonth <= adjustedMaxDate) {
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
        }
        else if (timeInterval.unit === "day") {
            // Day labels
            const currentDay = new Date(adjustedMinDate);
            while (currentDay <= adjustedMaxDate) {
                const x = xScale(currentDay);
                // Only add month labels on the 1st of each month
                if (currentDay.getDate() === 1) {
                    const monthLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    monthLabel.setAttribute("x", x.toString());
                    monthLabel.setAttribute("y", (this.margin.top - 35).toString());
                    monthLabel.setAttribute("text-anchor", "middle");
                    monthLabel.setAttribute("class", "month-label");
                    monthLabel.textContent = currentDay.toLocaleDateString("en-US", {
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
                }
                // Add day label and grid line
                const dayLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                dayLabel.setAttribute("x", x.toString());
                dayLabel.setAttribute("y", (this.margin.top - 15).toString());
                dayLabel.setAttribute("text-anchor", "middle");
                dayLabel.setAttribute("class", "date-label");
                dayLabel.textContent = currentDay.toLocaleDateString("en-US", timeInterval.format);
                grid.appendChild(dayLabel);
                const dayLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                dayLine.setAttribute("x1", x.toString());
                dayLine.setAttribute("x2", x.toString());
                dayLine.setAttribute("y1", (this.margin.top - 10).toString());
                dayLine.setAttribute("y2", (this.height - this.margin.bottom).toString());
                dayLine.setAttribute("class", "grid-line");
                grid.appendChild(dayLine);
                // Move to next day
                currentDay.setDate(currentDay.getDate() + timeInterval.interval);
            }
        }
        else if (timeInterval.unit === "hour") {
            // Hour labels (6-hour intervals)
            const currentHour = new Date(adjustedMinDate);
            currentHour.setHours(Math.floor(currentHour.getHours() / 6) * 6, 0, 0, 0); // Round to nearest 6-hour interval
            while (currentHour <= adjustedMaxDate) {
                const x = xScale(currentHour);
                // Only add month labels on the 1st of each month
                if (currentHour.getDate() === 1 && currentHour.getHours() === 0) {
                    const monthLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    monthLabel.setAttribute("x", x.toString());
                    monthLabel.setAttribute("y", (this.margin.top - 35).toString());
                    monthLabel.setAttribute("text-anchor", "middle");
                    monthLabel.setAttribute("class", "month-label");
                    monthLabel.textContent = currentHour.toLocaleDateString("en-US", {
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
                }
                // Add hour label and grid line
                const hourLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                hourLabel.setAttribute("x", x.toString());
                hourLabel.setAttribute("y", (this.margin.top - 15).toString());
                hourLabel.setAttribute("text-anchor", "middle");
                hourLabel.setAttribute("class", "date-label");
                hourLabel.textContent = currentHour.toLocaleDateString("en-US", timeInterval.format);
                grid.appendChild(hourLabel);
                const hourLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                hourLine.setAttribute("x1", x.toString());
                hourLine.setAttribute("x2", x.toString());
                hourLine.setAttribute("y1", (this.margin.top - 10).toString());
                hourLine.setAttribute("y2", (this.height - this.margin.bottom).toString());
                hourLine.setAttribute("class", "grid-line");
                grid.appendChild(hourLine);
                // Move to next 6-hour interval
                currentHour.setHours(currentHour.getHours() + 6);
            }
        }
        this.svgContent.appendChild(monthLabels);
        this.svgContent.appendChild(grid);
        // Render timeline
        const timeline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        timeline.setAttribute("x1", this.margin.left.toString());
        timeline.setAttribute("x2", (this.scrollableWidth - this.margin.right).toString());
        timeline.setAttribute("y1", (this.margin.top - 10).toString());
        timeline.setAttribute("y2", (this.margin.top - 10).toString());
        timeline.setAttribute("class", "timeline");
        this.svgContent.appendChild(timeline);
        // Add today marker if within range
        const today = new Date();
        if (today >= adjustedMinDate && today <= adjustedMaxDate) {
            const todayX = xScale(today);
            const todayLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            todayLine.setAttribute("x1", todayX.toString());
            todayLine.setAttribute("x2", todayX.toString());
            todayLine.setAttribute("y1", (this.margin.top - 10).toString());
            todayLine.setAttribute("y2", (this.height - this.margin.bottom).toString());
            todayLine.setAttribute("class", "today-line");
            const todayLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            todayLabel.setAttribute("x", todayX.toString());
            todayLabel.setAttribute("y", (this.margin.top - 45).toString());
            todayLabel.setAttribute("text-anchor", "middle");
            todayLabel.setAttribute("class", "today-label");
            todayLabel.textContent = "Today";
            this.svgContent.appendChild(todayLine);
            this.svgContent.appendChild(todayLabel);
        }
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
            this.svgContent.appendChild(groupHeader);
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
          <div class="gantt-table-cell task-name-cell">${task.name}</div>
        `;
                this.tableContainer.appendChild(tableRow);
                const startX = xScale(new Date(task.start));
                const endX = xScale(new Date(task.end));
                const barWidth = Math.max(endX - startX, 10); // Minimum width
                // Create a group for the task
                const taskGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                taskGroup.setAttribute("class", "task-group");
                // Task bar
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", startX.toString());
                rect.setAttribute("y", y.toString());
                rect.setAttribute("width", barWidth.toString());
                rect.setAttribute("height", "30");
                rect.setAttribute("class", `task priority-${Math.floor(task.priority)}`);
                rect.setAttribute("rx", "6"); // Rounded corners
                taskGroup.appendChild(rect);
                // Generate tooltip content using custom renderer if provided
                let tooltipContent = "";
                if (this.config.customTooltipRenderer) {
                    // Use custom tooltip renderer
                    tooltipContent = this.config.customTooltipRenderer(task);
                }
                else {
                    // Use default tooltip structure
                    tooltipContent = `<div class="tooltip-header" style="background: ${this.getPriorityColor(task.priority)}">
            <span class="tooltip-priority">Priority ${task.priority.toFixed(1)}</span>
            <span class="tooltip-title">${task.name}</span>
          </div>
          <div class="tooltip-content">`;
                    // Add configured fields to tooltip
                    if (this.config.tooltipFields) {
                        this.config.tooltipFields.forEach((field) => {
                            if (field !== "task_list") {
                                tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">${String(field)}:</span> <span class="tooltip-value">${task[field]}</span></div>`;
                            }
                        });
                    }
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
                }
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
                taskGroup.appendChild(text);
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
                    taskGroup.appendChild(dateText);
                }
                // Add progress indicator as a pattern or line instead of a separate bar
                if (task.progress !== undefined) {
                    // Add progress text on the bar if there's enough space
                    if (barWidth > 50) {
                        const progressText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        progressText.setAttribute("x", (startX + 10).toString());
                        progressText.setAttribute("y", (y + 25).toString());
                        progressText.setAttribute("class", "progress-text");
                        progressText.setAttribute("fill", "rgba(255, 255, 255, 0.9)");
                        progressText.setAttribute("font-size", "10");
                        progressText.setAttribute("pointer-events", "none");
                        progressText.textContent = `${task.progress}%`;
                        taskGroup.appendChild(progressText);
                    }
                }
                // Add invisible overlay for better tooltip handling
                const overlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                overlay.setAttribute("x", startX.toString());
                overlay.setAttribute("y", y.toString());
                overlay.setAttribute("width", barWidth.toString());
                overlay.setAttribute("height", "30");
                overlay.setAttribute("fill", "transparent");
                overlay.setAttribute("class", "task-overlay");
                overlay.setAttribute("data-tooltip", tooltipContent);
                taskGroup.appendChild(overlay);
                // Add the task group to the SVG
                this.svgContent.appendChild(taskGroup);
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
                this.svgContent.appendChild(separator);
                // Add separator to table as well
                const tableSeparator = document.createElement("div");
                tableSeparator.className = "gantt-table-separator";
                this.tableContainer.appendChild(tableSeparator);
            }
        });
        // Adjust SVG height based on content
        this.height = yOffset + 20;
        this.svg.setAttribute("height", this.height.toString());
        this.viewBox.height = this.height;
        this.updateViewBox();
        // Tooltip handling with simpler interaction
        this.svg.addEventListener("mouseover", (e) => {
            const target = e.target;
            // Find the closest task-overlay element
            let overlayElement = target;
            if (!target.classList.contains("task-overlay")) {
                const parent = target.closest(".task-group");
                if (parent) {
                    overlayElement = parent.querySelector(".task-overlay");
                }
            }
            if (overlayElement && overlayElement.classList.contains("task-overlay")) {
                const tooltipContent = overlayElement.getAttribute("data-tooltip");
                if (tooltipContent) {
                    this.tooltip.style.display = "block";
                    this.tooltip.innerHTML = tooltipContent;
                    // Position the tooltip near the task
                    const rect = overlayElement.getBoundingClientRect();
                    this.tooltip.style.left = `${rect.right + 10}px`;
                    this.tooltip.style.top = `${rect.top}px`;
                    this.tooltip.classList.add("visible");
                    // Handle interactive elements in custom tooltips
                    if (this.config.customTooltipRenderer) {
                        const links = this.tooltip.querySelectorAll("a");
                        links.forEach((link) => {
                            link.addEventListener("click", (e) => {
                                e.stopPropagation();
                            });
                        });
                    }
                }
            }
        });
        // Add event listener to keep tooltip visible when hovering over it
        this.tooltip.addEventListener("mouseover", () => {
            this.tooltip.classList.add("visible");
        });
        // Only hide tooltip when mouse leaves both the task and the tooltip
        this.tooltip.addEventListener("mouseleave", () => {
            this.tooltip.classList.remove("visible");
        });
        this.svg.addEventListener("mouseleave", () => {
            // Only hide if not hovering the tooltip
            if (!this.tooltip.matches(":hover")) {
                this.tooltip.classList.remove("visible");
            }
        });
        // Synchronize scrolling between table and chart
        this.svgContainer.addEventListener("scroll", () => {
            this.tableContainer.scrollTop = this.svgContainer.scrollTop;
        });
        this.tableContainer.addEventListener("scroll", () => {
            this.svgContainer.scrollTop = this.tableContainer.scrollTop;
        });
    }
    getPriorityColor(priority) {
        const mainPriority = Math.floor(priority);
        const colors = this.config.colors || {};
        return colors[mainPriority.toString()] || "#3b82f6"; // Default to blue
    }
}
