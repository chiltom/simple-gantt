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
    title: "Task A",
    start: "2025-05-01",
    end: "2025-05-10",
    priority: 1,
    description: "Do something",
  },
  {
    id: 2,
    title: "Task B",
    start: "2025-05-05",
    end: "2025-05-15",
    priority: 2,
    description: "Do another thing",
  },
];
new GanttChart("gantt-container", tasks, {
  nameField: "title",
  tooltipFields: ["title", "start", "end", "priority", "description"],
});
```

## Task Format

Tasks must include `start`, `end`, and `priority`, but can have any additional fields:

```ts
interface Task {
  start: string; // ISO date string (e.g., "2025-05-01")
  end: string; // ISO date string
  priority: number; // e.g., 1 or 2
  [key: string]: any; // Arbitrary fields
}
```

## Configuration

```ts
interface GanttConfig<T extends Task> {
  nameField: keyof T; // Field to display on task bar
  tooltipFields: (keyof T)[]; // Fields to show in tooltip
}
```

## Features

- Static, non-editable SVG Gantt chart.
- Tasks grouped by priority with a dashed separator.
- Configurable task field for bar display (e.g., `name`, `title`).
- Configurable tooltip fields (e.g., `start`, `end`, `description`).
- Modern styling, customizable via CSS.
- No external dependencies.

## Building from Source

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Output is in `dist/`.

