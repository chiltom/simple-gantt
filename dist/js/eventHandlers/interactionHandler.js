import { showTooltip, hideTooltip } from "../ui/tooltip.js";
/**
 * Sets up general interaction event listeners (e.g., tooltips on items).
 * @param ganttChartInstance The instance of the GanttChart class.
 * @param svgElement The main SVGSVGElement.
 */
export function setupInteractionEvents(ganttChartInstance, svgElement) {
    let activeTooltipTarget = null;
    svgElement.addEventListener("mouseover", (e) => {
        const target = e.target;
        const itemGroup = target.closest(".gantt-item-group"); // Find the parent group of the item
        if (itemGroup) {
            // Try to get the item data associated with the bar
            // We stored it on the barRect during rendering
            const barRect = itemGroup.querySelector(".gantt-item-bar");
            const itemData = barRect
                ? barRect.__ganttItem
                : null;
            if (itemData && ganttChartInstance.config.showTooltip) {
                activeTooltipTarget = itemGroup;
                const svgRect = ganttChartInstance.getSvgRect();
                if (svgRect) {
                    showTooltip(itemData, e, ganttChartInstance.config, svgRect);
                }
            }
        }
    });
    svgElement.addEventListener("mouseout", (e) => {
        const target = e.target;
        const itemGroup = target.closest(".gantt-item-group");
        // Only hide if the mouse is truly leaving the target that showed the tooltip
        // or if it's leaving the SVG area entirely.
        // TODO: A better solution might involve checking relatedTarget.
        if (itemGroup && itemGroup === activeTooltipTarget) {
            // Check if the mouse is moving to the tooltip itself
            const toElement = e.relatedTarget;
            if (toElement &&
                toElement.closest &&
                toElement.closest(".gantt-tooltip")) {
                // Mouse is over the tooltip, keep it open
                return;
            }
            hideTooltip();
            activeTooltipTarget = null;
        }
        else if (!e.relatedTarget ||
            e.relatedTarget.nodeName === "HTML") {
            // If mouse leaves SVG entirely
            hideTooltip();
            activeTooltipTarget = null;
        }
    });
    // Keep tooltip open if mouse enters it
    const tooltip = document.querySelector(".gantt-tooltip");
    if (tooltip) {
        tooltip.addEventListener("mouseleave", () => {
            hideTooltip();
            activeTooltipTarget = null;
        });
    }
    // Placeholder for Min/Max button interactions
    const minimizeBtn = document.querySelector(".gantt-minimize-btn");
    const maximizeBtn = document.querySelector(".gantt-maximize-btn");
    if (minimizeBtn) {
        minimizeBtn.addEventListener("click", () => ganttChartInstance.minimize());
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener("click", () => ganttChartInstance.maximize());
    }
    console.log("[InteractionHandler] Interaction event listeners (tooltips, etc.) set up.");
}
