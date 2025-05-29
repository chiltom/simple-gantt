/**
 * Creates the basic DOM structure for the Gantt chart.
 * @param parentElementId The ID of the HTML element where the chart will be rendered.
 * @param config The Gantt chart configuration.
 * @returns An object containing references to the created DOM elements.
 */
export function createDOMStructure(parentElementId, config) {
    const parentElement = document.getElementById(parentElementId);
    if (!parentElement) {
        throw new Error(`[DOM Setup] Parent element with ID '${parentElementId}' not found.`);
    }
    parentElement.innerHTML = ""; // Clear any existing content
    // Overall chart container
    const chartContainer = document.createElement("div");
    chartContainer.className = "gantt-chart-component"; // New top-level class
    // Title bar (for title and Min/Max buttons)
    let titleBar;
    if (config.enableMinMax || config.chartTitle) {
        titleBar = document.createElement("div");
        titleBar.className = "gantt-title-bar";
        if (config.chartTitle) {
            const titleEl = document.createElement("span");
            titleEl.className = "gantt-title";
            titleEl.textContent = config.chartTitle;
            titleBar.appendChild(titleEl);
        }
        if (config.enableMinMax) {
            const minMaxButtons = document.createElement("div");
            minMaxButtons.className = "gantt-minmax-buttons";
            // Placeholder for actual buttons
            minMaxButtons.innerHTML = `
        <button class="gantt-minimize-btn" title="Minimize">-</button>
        <button class="gantt-maximize-btn" title="Maximize">+</button>
      `;
            titleBar.appendChild(minMaxButtons);
        }
        chartContainer.appendChild(titleBar);
    }
    // Main content wrapper (for table and SVG area)
    const mainContentWrapper = document.createElement("div");
    mainContentWrapper.className = "gantt-main-content-wrapper";
    // Table container (for priority badges)
    const tableContainer = document.createElement("div");
    tableContainer.className = "gantt-table-container";
    tableContainer.style.flex = "0 0 60px"; // 60px width, no grow, no shrink
    tableContainer.style.overflowY = "hidden";
    tableContainer.style.position = "relative"; // For potential sticky header within table
    mainContentWrapper.appendChild(tableContainer);
    // SVG container
    const svgContainer = document.createElement("div");
    svgContainer.className = "gantt-svg-container";
    svgContainer.style.flex = "1"; // Takes remaining space
    svgContainer.style.overflowX = "hidden"; // Panning will be via viewBox
    svgContainer.style.overflowY = "auto"; // Allow vertical scroll if content overflows
    mainContentWrapper.appendChild(svgContainer);
    chartContainer.appendChild(mainContentWrapper);
    // SVG element
    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgElement.setAttribute("width", "100%"); // Responsive width
    // Height will be set dynamically based on content by GanttChart class
    svgElement.setAttribute("class", "gantt-svg");
    svgContainer.appendChild(svgElement);
    // SVG content group (for transforming content for pan/zoom via viewBox)
    const svgContentGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgContentGroup.setAttribute("class", "gantt-content-group");
    svgElement.appendChild(svgContentGroup);
    // Controls container (e.g., for zoom buttons, if not in title bar)
    let controlsContainer;
    if (config.enableZoom) {
        // Assuming zoom controls are separate for now
        controlsContainer = document.createElement("div");
        controlsContainer.className = "gantt-controls";
        // Placeholder for zoom buttons - will be populated by zoomHandler
        chartContainer.insertBefore(controlsContainer, mainContentWrapper); // Place above main content
    }
    parentElement.appendChild(chartContainer);
    console.log("[DOM Setup] Basic DOM structure created.");
    return {
        chartContainer,
        controlsContainer,
        titleBar,
        mainContentWrapper,
        tableContainer,
        svgContainer,
        svgElement,
        svgContentGroup,
    };
}
