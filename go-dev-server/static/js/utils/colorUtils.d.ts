/**
 * Gets the color for a given priority level
 * Uses the user-configured colors if provided, otherwise falls back to the default palette.
 * @param priority The priority number (e.g., 1.1, 2.0, 3.5).
 * @param configuredColors Optional user-defined colors from GanttConfig.
 * @returns The hex color string.
 */
export declare function getPriorityColor(priority: number, configuredColors?: {
    [priorityLevel: string]: string;
}): string;
/**
 * Lightens or darkens a hex color by a given percentage.
 * @param color The hex color string (e.g., "#RRGGBB").
 * @param percent The percentage to lighten (positive) or darken (negative). E.g., 20 for 20% lighter, -20 for 20% darker.
 * @returns The new hex color string.
 */
export declare function lightenDarkenColor(color: string, percent: number): string;
/**
 * Generates SVG gradient definitions for item bars based on priority colors.
 * @param configuredColors Optional user-defined colors from GanttConfig.
 * @returns An SVGElement containing <defs> with gradients.
 */
export declare function createSvgGradientDefs(configuredColors?: {
    [priorityLevel: string]: string;
}): SVGDefsElement;
