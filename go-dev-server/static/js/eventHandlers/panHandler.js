let isDragging = false;
let lastX = 0;
let lastY = 0;
/**
 * Sets up pan event listeners on the SVG container.
 * @param ganttChartInstance The instance of the GanttChart class.
 * @param svgContainer The HTMLDivElement containing the SVG.
 */
export function setupPanEvents(ganttChartInstance, svgContainer) {
    const onMouseDown = (e) => {
        if (e.button !== 0)
            return; // Only pan with left mouse button
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        svgContainer.style.cursor = "grabbing";
        e.preventDefault();
    };
    const onMouseMove = (e) => {
        if (!isDragging)
            return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        ganttChartInstance.pan(dx, dy);
        lastX = e.clientX;
        lastY = e.clientY;
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
