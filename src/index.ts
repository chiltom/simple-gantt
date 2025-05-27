// Export core types for consumers of the library
export type { Item } from "./core/item.js";
export type { GanttConfig } from "./core/config.js";

// Export the main GanttChart class
export { GanttChart } from "./core/ganttChart.js";

console.log(
  "src/index.ts (Gantt Chart Library Entry Point) loaded successfully. Using new core types.",
);
