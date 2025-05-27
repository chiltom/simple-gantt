import type { GanttConfig } from "../core/config.js";
import type { Item } from "../core/item.js";
export interface DOMStructure {
    chartContainer: HTMLDivElement;
    controlsContainer?: HTMLDivElement;
    titleBar?: HTMLDivElement;
    mainContentWrapper: HTMLDivElement;
    tableContainer: HTMLDivElement;
    svgContainer: HTMLDivElement;
    svgElement: SVGSVGElement;
    svgContentGroup: SVGGElement;
}
/**
 * Creates the basic DOM structure for the Gantt chart.
 * @param parentElementId The ID of the HTML element where the chart will be rendered.
 * @param config The Gantt chart configuration.
 * @returns An object containing references to the created DOM elements.
 */
export declare function createDOMStructure<T extends Item>(parentElementId: string, config: GanttConfig<T>): DOMStructure;
