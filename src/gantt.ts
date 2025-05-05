import { Task, GanttConfig } from "./types";

export class GanttChart<T extends Task> {
  private svg: SVGSVGElement;
  private tasks: T[];
  private config: GanttConfig<T>;
  private width: number = 1000; // Base width, adjusted dynamically
  private height: number = 400; // Adjusted dynamically
  private margin = { top: 60, right: 20, bottom: 20, left: 150 };
  private scrollableWidth: number;

  constructor(containerId: string, tasks: T[], config: GanttConfig<T>) {
    const container = document.getElementById(containerId);
    if (!container)
      throw new Error(`Container with ID ${containerId} not found`);

    // Compute dynamic dimensions
    const containerRect = container.getBoundingClientRect();
    this.width = containerRect.width || this.width;
    this.height = Math.max(400, tasks.length * 30 + 100); // Adjust height based on tasks
    this.scrollableWidth = (this.width * (config.timelineMonths || 12)) / 3; // Approx 3 months per width

    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", this.scrollableWidth.toString());
    this.svg.setAttribute("height", this.height.toString());
    this.svg.setAttribute(
      "viewBox",
      `0 0 ${this.scrollableWidth} ${this.height}`,
    );
    container.appendChild(this.svg);

    this.tasks = tasks;
    this.config = { timelineMonths: 12, ...config }; // Default to 12 months
    this.render();
  }

  private render() {
    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    document.body.appendChild(tooltip);

    // Group tasks by priority
    const tasksByPriority = this.tasks.reduce(
      (acc, task) => {
        acc[task.priority] = acc[task.priority] || [];
        acc[task.priority].push(task);
        return acc;
      },
      {} as Record<number, T[]>,
    );

    // Calculate date range
    const timestamps = this.tasks.flatMap((t: T) => [
      new Date(t.start).getTime(),
      new Date(t.end).getTime(),
    ]);
    const minDate = new Date(Math.min(...timestamps));
    minDate.setDate(minDate.getDate() - 30); // Buffer: 1 month before
    const maxDate = new Date(Math.max(...timestamps));
    maxDate.setFullYear(
      maxDate.getFullYear(),
      maxDate.getMonth() + (this.config.timelineMonths || 12),
    ); // Extend timeline

    // X-scale for timeline
    const xScale = (date: Date): number => {
      return (
        this.margin.left +
        ((date.getTime() - minDate.getTime()) /
          (maxDate.getTime() - minDate.getTime())) *
          (this.scrollableWidth - this.margin.left - this.margin.right)
      );
    };

    // Render background grid
    const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const days =
      (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const interval = Math.ceil(days / 20); // Approx 20 intervals
    for (
      let d = new Date(minDate);
      d <= maxDate;
      d.setDate(d.getDate() + interval)
    ) {
      const x = xScale(d);
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", x.toString());
      line.setAttribute("x2", x.toString());
      line.setAttribute("y1", (this.margin.top - 10).toString());
      line.setAttribute("y2", (this.height - this.margin.bottom).toString());
      line.setAttribute("class", "grid-line");
      grid.appendChild(line);

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", x.toString());
      text.setAttribute("y", (this.margin.top - 20).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", "date-label");
      text.textContent = d.toISOString().split("T")[0];
      grid.appendChild(text);
    }
    this.svg.appendChild(grid);

    // Render timeline
    const timeline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    timeline.setAttribute("x1", this.margin.left.toString());
    timeline.setAttribute(
      "x2",
      (this.scrollableWidth - this.margin.right).toString(),
    );
    timeline.setAttribute("y1", (this.margin.top - 10).toString());
    timeline.setAttribute("y2", (this.margin.top - 10).toString());
    timeline.setAttribute("class", "timeline");
    this.svg.appendChild(timeline);

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
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", startX.toString());
        rect.setAttribute("y", y.toString());
        rect.setAttribute("width", Math.max(endX - startX, 10).toString()); // Minimum width
        rect.setAttribute("height", "20");
        rect.setAttribute("class", `task priority-${priority}`);
        rect.setAttribute("data-tooltip", tooltipContent);
        this.svg.appendChild(rect);

        // Task name
        const name = String(task[this.config.nameField]);
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        text.setAttribute("x", (startX + 5).toString());
        text.setAttribute("y", (y + 14).toString());
        text.setAttribute("class", "task-name");
        text.textContent =
          name.length > 20 ? name.substring(0, 17) + "..." : name;
        this.svg.appendChild(text);

        // Task label (left)
        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        label.setAttribute("x", (this.margin.left - 10).toString());
        label.setAttribute("y", (y + 14).toString());
        label.setAttribute("text-anchor", "end");
        label.setAttribute("class", "task-label");
        label.textContent = name;
        this.svg.appendChild(label);
      });

      yOffset += taskGroup.length * 30 + 20;

      // Priority separator
      if (pIndex < priorities.length - 1) {
        const separator = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        separator.setAttribute("x1", this.margin.left.toString());
        separator.setAttribute(
          "x2",
          (this.scrollableWidth - this.margin.right).toString(),
        );
        separator.setAttribute("y1", (yOffset - 10).toString());
        separator.setAttribute("y2", (yOffset - 10).toString());
        separator.setAttribute("class", "separator");
        this.svg.appendChild(separator);

        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        label.setAttribute("x", (this.margin.left - 10).toString());
        label.setAttribute("y", (yOffset - 5).toString());
        label.setAttribute("text-anchor", "end");
        label.setAttribute("class", "separator-label");
        label.textContent = `${priority}`;
        this.svg.appendChild(label);
      }
    });

    // Tooltip handling with scroll adjustment
    this.svg.addEventListener("mousemove", (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target.classList.contains("task")) {
        const rect = target.getBoundingClientRect();
        tooltip.style.display = "block";
        tooltip.innerHTML = target.getAttribute("data-tooltip") || "";
        tooltip.style.left = `${e.clientX + 10}px`; // Use clientX for scroll-adjusted position
        tooltip.style.top = `${e.clientY + 10}px`; // Use clientY
      } else {
        tooltip.style.display = "none";
      }
    });
  }
}
