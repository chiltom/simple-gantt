/**
 * Sets up zoom controls and event listeners.
 * @param ganttChartInstance The instance of the GanttChart class.
 * @param controlsContainer The HTMLDivElement for zoom controls.
 * @param svgContainer The HTMLDivElement containing the SVG (for wheel zoom).
 */
export function setupZoomControls(ganttChartInstance, controlsContainer, svgContainer) {
    // Create zoom buttons
    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "gantt-zoom-btn gantt-zoom-in";
    zoomInBtn.title = "Zoom In";
    zoomInBtn.innerHTML = "+";
    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "gantt-zoom-btn gantt-zoom-out";
    zoomOutBtn.title = "Zoom Out";
    zoomOutBtn.innerHTML = "-";
    const zoomResetBtn = document.createElement("button");
    zoomResetBtn.className = "gantt-zoom-btn gantt-zoom-reset";
    zoomResetBtn.title = "Reset Zoom";
    zoomResetBtn.textContent = "Reset";
    const zoomLevelDisplay = document.createElement("span");
    zoomLevelDisplay.className = "gantt-zoom-level";
    // Initial display update will be handled by GanttChart's render or an updateZoomDisplay method
    controlsContainer.appendChild(zoomInBtn);
    controlsContainer.appendChild(zoomLevelDisplay); // Display between buttons
    controlsContainer.appendChild(zoomOutBtn);
    controlsContainer.appendChild(zoomResetBtn);
    // Add event listeners for zoom buttons
    zoomInBtn.addEventListener("click", () => ganttChartInstance.zoom(0.2));
    zoomOutBtn.addEventListener("click", () => ganttChartInstance.zoom(-0.2));
    zoomResetBtn.addEventListener("click", () => ganttChartInstance.resetZoom());
    // Add wheel zoom event listener to SVG container
    svgContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1; // Negative deltaY for scroll down (zoom out)
        // Get mouse position relative to SVG
        const svgRect = ganttChartInstance.getSvgRect(); // Method to get SVG's bounding rect
        if (!svgRect)
            return;
        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;
        ganttChartInstance.zoomAtPoint(delta, mouseX, mouseY);
    }, { passive: false });
    console.log("[ZoomHandler] Zoom controls and wheel listener set up.");
}
/**
 * Updates the zoom level display.
 * @param zoomLevel The current zoom level (e.g., 1.0 for 100%).
 */
export function updateZoomLevelDisplay(zoomLevel) {
    const zoomLevelDisplayElement = document.querySelector(".gantt-zoom-level");
    if (zoomLevelDisplayElement) {
        zoomLevelDisplayElement.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
}
