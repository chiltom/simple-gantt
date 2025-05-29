import type { Item } from "../core/item.js";
import type { GanttConfig } from "../core/config.js";
/**
 * Renders the table part of the Gantt chart (e.g., item names, priority badges).
 * For this version, it will only render priority badges without task names.
 * @param tableContainer The element that will contain the table.
 * @param items The array of items to render.
 * @param config The Gantt chart configuration.
 * @param rowHeight The height of each row, to align with SVG.
 * @param totalItemAreaHeight The height of the entire item area.
 * @param topMargin The top margin to apply, matching SVG.
 */
export declare function renderTable<T extends Item>(tableContainer: HTMLDivElement, items: T[], // Items should be pre-sorted if a specific order is always needed
config: GanttConfig<T>, rowHeight: number, totalItemAreaHeight: number, topMargin: number): void;
