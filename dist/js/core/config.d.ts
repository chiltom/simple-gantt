import type { Item } from "./item.js";
/**
 * Configuration options for the Gantt chart.
 *
 * By using a generic type and extending the Item interface, this setup
 * ensures that any Gantt chart Item at a minimum has the required properties
 * of Item while remaining modular to the possibility optional values.
 */
export interface GanttConfig<T extends Item> {
    colors?: {
        [priorityLevel: string]: string;
    };
    barHeight?: number;
    rowHeight?: number;
    padding?: number;
    timelineMonths?: number;
    dateFormat?: string;
    gridLines?: "horizontal" | "vertical" | "both" | "none";
    showTooltip?: boolean;
    tooltipFields?: (keyof T)[];
    customTooltipRenderer?: (item: T) => string;
    enableZoom?: boolean;
    enablePan?: boolean;
    showPriorityColumn?: boolean;
    onItemClick?: (item: T) => void;
    onItemContextMenu?: (item: T, event: MouseEvent) => void;
    enableMinMax?: boolean;
    chartTitle?: string;
}
/**
 * Default configuration values for the Gantt chart.
 */
export declare function getDefaultConfig<T extends Item>(): GanttConfig<T>;
