/**
 * Default configuration values for the Gantt chart.
 */
export function getDefaultConfig() {
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
