import type { Item } from "../core/item.js";
import type { GanttConfig } from "../core/config.js";
import type { DateRange } from "../utils/dateUtils.js";
interface RenderContext {
    svgContentGroup: SVGGElement;
    items: Item[];
    config: GanttConfig<Item>;
    xScale: (date: Date) => number;
    rowHeight: number;
    barHeight: number;
    barPadding: number;
    containerWidth: number;
    containerHeight: number;
    visibleDateRange: DateRange;
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
/**
 * Main rendering function for the SVG part of the Gantt chart.
 * Clears previous content and draws grid, items, labels, etc.
 * @param context The rendering context.
 */
export declare function renderSVGContent(context: RenderContext): void;
export {};
