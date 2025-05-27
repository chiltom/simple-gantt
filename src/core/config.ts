import type { Item } from "./item.js";

/**
 * Configuration options for the Gantt chart.
 *
 * By using a generic type and extending the Item interface, this setup
 * ensures that any Gantt chart Item at a minimum has the required properties
 * of Item while remaining modular to the possibility optional values.
 */
export interface GanttConfig<T extends Item> {
  // Styling and Appearance
  colors?: { [priorityLevel: string]: string }; // Custom colors for priority groups (e.g., 1: "#3b82f6")
  barHeight?: number; // Height of the task bars in pixels
  rowHeight?: number; // Height of each row in the Gantt chart grid area
  padding?: number; // Padding around bars

  // Timeline and Grid
  timelineMonths?: number; // Default number of months to display if tasks don't define a wide range
  dateFormat?: string; // Format for display dates (e.g., "MM/DD/YYYY", "DD MMM") - for future use
  gridLines?: "horizontal" | "vertical" | "both" | "none"; // Which grid lines to show

  // Tooltip
  showTooltip?: boolean; // Whether to show tooltips on hover
  tooltipFields?: (keyof T)[]; // Fields from Item to display in the tooltip
  customTooltipRenderer?: (item: T) => string; // Custom HTML renderer for tooltip content

  // Interactivity
  enableZoom?: boolean; // Enable zoom functionality
  enablePan?: boolean; // Enable panning functionality

  // UI Elements
  showPriorityColumn?: boolean; // Whether to show the priority badge column

  // Callbacks
  onItemClick?: (item: T) => void; // Callback when an item bar is clicked
  onItemContextMenu?: (item: T, event: MouseEvent) => void; // Callback for item context menu

  // Minimizable/Maximizable
  enableMinMax?: boolean; // Enable minimize/maximize functionality
  chartTitle?: string; // Title for the chart, useful when minimizable
}

/**
 * Default configuration values for the Gantt chart.
 */
export function getDefaultConfig<T extends Item>(): GanttConfig<T> {
  return {
    colors: {}, // Default colors will be applied by colorUtils if not overridden
    barHeight: 28,
    rowHeight: 40, // Includes padding for the bar
    padding: 6, // (rowHeight - barHeight) / 2

    timelineMonths: 12,
    dateFormat: "MMM D", // Example: "Jun 15"

    showTooltip: true,
    // tooltipFields: ["name", "start", "end", "priority", "progress", "item_list"], // Default fields

    enableZoom: true,
    enablePan: true,

    showPriorityColumn: true,

    enableMinMax: false, // Disabled by default
    chartTitle: "Gantt chart",
  };
}
