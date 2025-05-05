export class GanttChart {
    constructor(containerId, tasks, config) {
        this.width = 1000;
        this.height = 400;
        this.margin = { top: 40, right: 20, bottom: 20, left: 150 };
        const container = document.getElementById(containerId);
        if (!container)
            throw new Error(`Container with ID ${containerId} not found`);
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", this.width.toString());
        this.svg.setAttribute("height", this.height.toString());
        this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
        container.appendChild(this.svg);
        this.tasks = tasks;
        this.config = config;
        this.render();
    }
    render() {
        // Create tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        document.body.appendChild(tooltip);
        // Group tasks by priority
        const tasksByPriority = this.tasks.reduce((acc, task) => {
            acc[task.priority] = acc[task.priority] || [];
            acc[task.priority].push(task);
            return acc;
        }, {});
        // Calculate date range
        const timestamps = this.tasks.flatMap((t) => [
            new Date(t.start).getTime(),
            new Date(t.end).getTime(),
        ]);
        const minDate = new Date(Math.min(...timestamps));
        minDate.setDate(minDate.getDate() - 1); // Buffer
        const maxDate = new Date(Math.max(...timestamps));
        maxDate.setDate(maxDate.getDate() + 1); // Buffer
        // X-scale for timeline
        const xScale = (date) => {
            return (this.margin.left +
                ((date.getTime() - minDate.getTime()) /
                    (maxDate.getTime() - minDate.getTime())) *
                    (this.width - this.margin.left - this.margin.right));
        };
        // Render timeline
        const timeline = document.createElementNS("http://www.w3.org/2000/svg", "line");
        timeline.setAttribute("x1", this.margin.left.toString());
        timeline.setAttribute("x2", (this.width - this.margin.right).toString());
        timeline.setAttribute("y1", (this.margin.top - 10).toString());
        timeline.setAttribute("y2", (this.margin.top - 10).toString());
        timeline.setAttribute("stroke", "#333");
        timeline.setAttribute("stroke-width", "2");
        this.svg.appendChild(timeline);
        // Render date labels (weekly)
        const days = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
        const interval = Math.ceil(days / 10);
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + interval)) {
            const x = xScale(d);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x.toString());
            text.setAttribute("y", (this.margin.top - 20).toString());
            text.setAttribute("text-anchor", "middle");
            text.textContent = d.toISOString().split("T")[0];
            this.svg.appendChild(text);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x.toString());
            line.setAttribute("x2", x.toString());
            line.setAttribute("y1", (this.margin.top - 10).toString());
            line.setAttribute("y2", (this.height - this.margin.bottom).toString());
            line.setAttribute("stroke", "#ddd");
            line.setAttribute("stroke-width", "1");
            this.svg.appendChild(line);
        }
        // Render tasks by priority
        let yOffset = this.margin.top;
        const priorities = Object.keys(tasksByPriority).map(Number).sort();
        priorities.forEach((priority, pIndex) => {
            const taskGroup = tasksByPriority[priority];
            taskGroup.forEach((task, i) => {
                const y = yOffset + i * 30;
                const startX = xScale(new Date(task.start));
                const endX = xScale(new Date(task.end));
                // Generate tooltip content
                const tooltipContent = this.config.tooltipFields
                    .map((field) => `${String(field)}: ${task[field]}`)
                    .join("<br>");
                // Task bar
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", startX.toString());
                rect.setAttribute("y", y.toString());
                rect.setAttribute("width", Math.max(endX - startX, 10).toString()); // Minimum width
                rect.setAttribute("height", "20");
                rect.setAttribute("class", `task priority-${priority}`);
                rect.setAttribute("data-tooltip", tooltipContent);
                this.svg.appendChild(rect);
                // Task name
                const name = String(task[this.config.nameField]);
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", (startX + 5).toString());
                text.setAttribute("y", (y + 14).toString());
                text.setAttribute("fill", "#fff");
                text.textContent =
                    name.length > 20 ? name.substring(0, 17) + "..." : name;
                this.svg.appendChild(text);
                // Task label (left)
                const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute("x", (this.margin.left - 10).toString());
                label.setAttribute("y", (y + 14).toString());
                label.setAttribute("text-anchor", "end");
                label.textContent = name;
                this.svg.appendChild(label);
            });
            yOffset += taskGroup.length * 30 + 20;
            // Priority separator
            if (pIndex < priorities.length - 1) {
                const separator = document.createElementNS("http://www.w3.org/2000/svg", "line");
                separator.setAttribute("x1", this.margin.left.toString());
                separator.setAttribute("x2", (this.width - this.margin.right).toString());
                separator.setAttribute("y1", (yOffset - 10).toString());
                separator.setAttribute("y2", (yOffset - 10).toString());
                separator.setAttribute("stroke", "#333");
                separator.setAttribute("stroke-width", "2");
                separator.setAttribute("stroke-dasharray", "5,5");
                this.svg.appendChild(separator);
                const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute("x", (this.margin.left - 10).toString());
                label.setAttribute("y", (yOffset - 5).toString());
                label.setAttribute("text-anchor", "end");
                label.textContent = `Priority ${priority}`;
                this.svg.appendChild(label);
            }
        });
        // Tooltip handling
        this.svg.addEventListener("mousemove", (e) => {
            const target = e.target;
            if (target.classList.contains("task")) {
                const rect = target.getBoundingClientRect();
                tooltip.style.display = "block";
                tooltip.innerHTML = target.getAttribute("data-tooltip") || "";
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
            }
            else {
                tooltip.style.display = "none";
            }
        });
    }
}
