import type { GanttChart } from "../core/ganttChart.js";
/**
 * Sets up zoom controls and event listeners.
 * @param ganttChartInstance The instance of the GanttChart class.
 * @param controlsContainer The HTMLDivElement for zoom controls.
 * @param svgContainer The HTMLDivElement containing the SVG (for wheel zoom).
 */
export declare function setupZoomControls(ganttChartInstance: GanttChart<any>, controlsContainer: HTMLDivElement, svgContainer: HTMLDivElement): void;
/**
 * Updates the zoom level display.
 * @param zoomLevel The current zoom level (e.g., 1.0 for 100%).
 */
export declare function updateZoomLevelDisplay(zoomLevel: number): void;
