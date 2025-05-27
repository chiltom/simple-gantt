let tooltipElement = null;
/**
 * Initializes the tooltip element and appends it to the body.
 * Should be called once when the Gantt chart is created.
 */
export function initializeTooltip() {
    if (tooltipElement)
        return; // Already initialized
    tooltipElement = document.createElement("div");
    tooltipElement.className = "gantt-tooltip";
    // Styles for initial hidden state are in CSS (.tooltip { display: none; opacity: 0; })
    document.body.appendChild(tooltipElement);
    console.log("[Tooltip] Tooltip initialized.");
}
/**
 * Shows the tooltip with content for the given item.
 * @param item The item to display in the tooltip.
 * @param event The mouse event that triggered the tooltip (for positioning).
 * @param config The Gantt chart configuration.
 * @param svgRect The bounding client rect of the SVG element, for positioning.
 */
export function showTooltip(item, event, config, svgRect) {
    if (!tooltipElement || !config.showTooltip)
        return;
    let content = "";
    if (config.customTooltipRenderer) {
        content = config.customTooltipRenderer(item);
    }
    else {
        // Default tooltip rendering
        content = `
      <div class="tooltip-header" style="background-color: ${item.color || "#ccc"}"> <!-- item.color needs to be set -->
        <span class="tooltip-priority">Priority ${item.priority.toFixed(1)}</span>
        <span class="tooltip-title">${item.name}</span>
      </div>
      <div class="tooltip-content">
    `;
        const fieldsToShow = config.tooltipFields || ["start", "end"];
        fieldsToShow.forEach((fieldKey) => {
            const key = fieldKey;
            let value = item[key];
            if (key === "start" || key === "end") {
                value = new Date(value).toLocaleDateString();
            }
            else if (key === "progress" && typeof value === "number") {
                value = `${value}%`;
            }
            else if (key === "item_list" && Array.isArray(value)) {
                // Special handling for item_list
                if (value.length > 0) {
                    content += `
            <div class="tooltip-section">
              <div class="tooltip-section-header">Details:</div>
              <ul class="tooltip-task-list">
                ${value.map((subItem) => `<li>${subItem}</li>`).join("")}
              </ul>
            </div>
          `;
                }
                return; // Skip default row rendering for item_list
            }
            if (value !== undefined && value !== null && key !== "item_list") {
                // Capitalize first letter of fieldKey for label
                const label = String(key).charAt(0).toUpperCase() + String(key).slice(1);
                content += `
          <div class="tooltip-row">
            <span class="tooltip-label">${label}:</span>
            <span class="tooltip-value">${value}</span>
          </div>
        `;
            }
        });
        content += `</div>`;
    }
    tooltipElement.innerHTML = content;
    tooltipElement.style.display = "block"; //Make it visible
    // Position the tooltip
    // Attempt to position relative to the mouse, but constrained by viewport
    const { clientX, clientY } = event;
    const tooltipRect = tooltipElement.getBoundingClientRect();
    let top = clientY + 15; // Offset from cursor
    let left = clientX + 15;
    // Adjust if tooltip goes off-screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = clientX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
        top = clientY - tooltipRect.height - 15;
    }
    // Ensure it's not off-screen top/left
    if (top < 0)
        top = 0;
    if (left < 0)
        left = 0;
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
    // Timeout to allow the browser to render the tooltip and then apply opacity transition
    setTimeout(() => {
        if (tooltipElement)
            tooltipElement.classList.add("visible");
    }, 0);
}
/**
 * Hides the tooltip.
 */
export function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove("visible");
        setTimeout(() => {
            if (tooltipElement && !tooltipElement.classList.contains("visible")) {
                tooltipElement.style.display = "none";
            }
        }, 200); // Match CSS transition duration
    }
}
/**
 * Cleans up the tooltip element from the DOM.
 * Should be called when the Gantt chart is destroyed.
 */
export function destroyTooltip() {
    if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
        console.log("[Tooltip] Tooltip destroyed.");
    }
}
