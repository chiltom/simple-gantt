import type { GanttChart } from "../core/ganttChart.js"; // Use forward declaration or interface

let isDragging: boolean = false;
let lastX: number = 0;
// let lastY: number = 0; // Vertical panning might be restricted or handled differently

/**
 * Sets up pan event listeners on the SVG container.
 * @param ganttChartInstance The instance of the GanttChart class.
 * @param svgContainer The HTMLDivElement containing the SVG.
 */
export function setupPanEvents(
  ganttChartInstance: GanttChart<any>,
  svgContainer: HTMLDivElement,
): void {
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only pan with left mouse button
    isDragging = true;
    lastX = e.clientX;
    // lastY = e.clientY;
    svgContainer.style.cursor = "grabbing";
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dx: number = e.clientX - lastX;
    // const dy: number = e.clientY - lastY; // If vertical panning is needed

    ganttChartInstance.pan(dx, 0); // Pan horizontally, dy is 0 for now

    lastX = e.clientX;
    // lastY = e.clientY;
    e.preventDefault();
  };

  const onMouseUpOrLeave = () => {
    if (isDragging) {
      isDragging = false;
      svgContainer.style.cursor = "grab";
    }
  };

  svgContainer.addEventListener("mousedown", onMouseDown);
  // Listen on window for mousemove and mouseup to handle dragging outside svgContainer
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUpOrLeave);
  svgContainer.addEventListener("mouseleave", onMouseUpOrLeave); // Stop dragging if mouse leaves container

  svgContainer.style.cursor = "grab";
  console.log("[PanHandler] Pan event listeners set up.");
}
