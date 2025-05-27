import type { Item } from "../core/item.js";
import type { GanttConfig } from "../core/config.js";
/**
 * Initializes the tooltip element and appends it to the body.
 * Should be called once when the Gantt chart is created.
 */
export declare function initializeTooltip(): void;
/**
 * Shows the tooltip with content for the given item.
 * @param item The item to display in the tooltip.
 * @param event The mouse event that triggered the tooltip (for positioning).
 * @param config The Gantt chart configuration.
 * @param svgRect The bounding client rect of the SVG element, for positioning.
 */
export declare function showTooltip<T extends Item>(item: T, event: MouseEvent, config: GanttConfig<T>, svgRect: DOMRect): void;
/**
 * Hides the tooltip.
 */
export declare function hideTooltip(): void;
/**
 * Cleans up the tooltip element from the DOM.
 * Should be called when the Gantt chart is destroyed.
 */
export declare function destroyTooltip(): void;
