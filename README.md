# Gantt Chart Package

A lightweight, static SVG-based Gantt chart package built with TypeScript and CSS. Displays tasks grouped by priority with tooltips and a modern design. Supports arbitrary task fields with configurable display and tooltip fields. No external dependencies, suitable for air-gapped environments.

## Installation

1. Copy the `dist` folder (`gantt.js`, `styles.css`) to your project.
2. Include the files in your HTML:

```html
<link rel="stylesheet" href="path/to/styles.css" />
<script src="path/to/gantt.js"></script>
```

## Usage

1. Create a container element:

```html
<div id="gantt-container" class="gantt-container"></div>
```

2. Initialize the chart with task data and configuration:

```ts
const tasks = [
  {
    id: 1,
    priority: 1.1,
    name: "Task A",
    start: "2025-05-01",
    end: "2025-05-10",
    task_list: ["Do this thing", "Do it good"],
    owner: "Alice",
  },
  {
    id: 2,
    priority: 2.2,
    name: "Task B",
    start: "2025-05-05",
    end: "2025-05-15",
    task_list: ["Do that thing", "Do it better"],
    owner: "Bob",
  },
];
new GanttChart("gantt-container", tasks, {
  tooltipFields: ["name", "start", "end", "priority", "owner"],
  showTaskList: true,
  timelineMonths: 3,
});
```

> Note: If you would like to use a custom HTML tooltip, use the following
> property and define it within the constructor:

```ts
// Example with custom tooltip renderer
new GanttChart("gantt-container", tasks, {
  tooltipFields: ["name", "start", "end", "priority", "owner"],
  showTaskList: true,
  timelineMonths: 3,
  customTooltipRenderer: function (task) {
    return `
        <div class="tooltip-header" style="background: ${task.priority < 2 ? "#3b82f6" : task.priority < 3 ? "#ec4899" : "#10b981"}">
          <span class="tooltip-priority">Priority ${task.priority.toFixed(1)}</span>
          <span class="tooltip-title">${task.name}</span>
        </div>
        <div class="tooltip-content">
          <div class="tooltip-row">
            <span class="tooltip-label">Duration:</span> 
            <span class="tooltip-value">${new Date(task.start).toLocaleDateString()} to ${new Date(task.end).toLocaleDateString()}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Owner:</span> 
            <span class="tooltip-value">${task.owner}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Progress:</span> 
            <span class="tooltip-value">${task.progress}%</span>
          </div>
          <div class="tooltip-section">
            <div class="tooltip-section-header">Actions:</div>
            <div style="margin-top: 8px;">
              <a href="#" onclick="alert('View details for task: ${task.id}'); return false;" 
                 style="display: inline-block; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; 
                        text-decoration: none; color: #1f2937; margin-right: 8px;">
                View Details
              </a>
              <a href="#" onclick="alert('Edit task: ${task.id}'); return false;" 
                 style="display: inline-block; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; 
                        text-decoration: none; color: #1f2937;">
                Edit
              </a>
            </div>
          </div>
        </div>
      `;
  },
});
```

## Task Format

Tasks must include `start`, `end`, `name`, `id`, and `priority`, but can have any additional fields:

```ts
interface Task {
  id: number; // Number ID of the task, e.g. Serial ID
  name: string; // The name of the task, e.g. Washing the Car
  start: string; // ISO date string (e.g., "2025-05-01")
  end: string; // ISO date string
  priority: number; // e.g., 1.1 or 2.2
  task_list?: string[]; // The associated subtasks of the Task if necessary
  [key: string]: any; // Any other necessary fields
}
```

## Configuration

```ts
interface GanttConfig<T extends Task> {
  tooltipFields: (keyof T)[]; // Fields to show in tooltip
  timelineMonths?: number; // Number of months to display (default 12)
  showTaskList?: boolean; // Whether to show task list in tooltip
  colors?: {
    [priority: number]: string; // Custom colors for priority groups
  };
  customTooltipRenderer?: (task: T) => string; // Custom tooltip renderer function
}
```

## Features

- Static, non-editable SVG Gantt chart.
- Horizontal scrolling for extended timelines.
- Responsive design adapting to container size.
- Tasks grouped by priority with a dashed separator.
- Configurable tooltip fields (e.g., `start`, `end`, `description`).
- Modern styling with gradients, shadows, and animations.
- No external dependencies.

## Styling

- Uses Roboto font (optional, falls back to sans-serif).
- Customizable via `styles.css` (colors, fonts, etc.).
- Gradient-filled task bars, hover animations, and smooth tooltips.

## Building from Source

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Output is in `dist/`.
