import type { GanttChart } from "../core/ganttChart.js";
import type { Item } from "../core/item.js";
import { showTooltip, hideTooltip } from "../ui/tooltip.js";

/**
 * Sets up general interaction event listeners (e.g., tooltips on items).
 * @param ganttChartInstance The instance of the GanttChart class.
 * @param svgElement The main SVGSVGElement.
 */
export function setupInteractionEvents(
  ganttChartInstance: GanttChart<any>,
  svgElement: SVGSVGElement,
): void {
  let activeTooltipTarget: EventTarget | null = null;

  svgElement.addEventListener("mouseover", (e: MouseEvent) => {
    const target: SVGElement | null = e.target as SVGElement;
    const itemGroup: Element | null = target.closest(".gantt-item-group"); // Find the parent group of the item

    if (itemGroup) {
      // Try to get the item data associated with the bar
      // We stored it on the barRect during rendering
      const barRect: Element | null =
        itemGroup.querySelector(".gantt-item-bar");
      const itemData: Item | null = barRect
        ? ((barRect as any).__ganttItem as Item)
        : null;

      if (itemData && ganttChartInstance.config.showTooltip) {
        activeTooltipTarget = itemGroup;
        const svgRect: DOMRect | null = ganttChartInstance.getSvgRect();
        if (svgRect) {
          showTooltip(itemData, e, ganttChartInstance.config, svgRect);
        }
      }
    }
  });

  svgElement.addEventListener("mouseout", (e: MouseEvent) => {
    const target: SVGElement | null = e.target as SVGElement;
    const itemGroup: Element | null = target.closest(".gantt-item-group");

    // Only hide if the mouse is truly leaving the target that showed the tooltip
    // or if it's leaving the SVG area entirely.
    // TODO: A better solution might involve checking relatedTarget.
    if (itemGroup && itemGroup === activeTooltipTarget) {
      // Check if the mouse is moving to the tooltip itself
      const toElement: HTMLElement | null = e.relatedTarget as HTMLElement;
      if (
        toElement &&
        toElement.closest &&
        toElement.closest(".gantt-tooltip")
      ) {
        // Mouse is over the tooltip, keep it open
        return;
      }
      hideTooltip();
      activeTooltipTarget = null;
    } else if (
      !e.relatedTarget ||
      (e.relatedTarget as Node).nodeName === "HTML"
    ) {
      // If mouse leaves SVG entirely
      hideTooltip();
      activeTooltipTarget = null;
    }
  });

  // Keep tooltip open if mouse enters it
  const tooltip: Element | null = document.querySelector(".gantt-tooltip");
  if (tooltip) {
    tooltip.addEventListener("mouseleave", () => {
      hideTooltip();
      activeTooltipTarget = null;
    });
  }

  // Placeholder for Min/Max button interactions
  const minimizeBtn: Element | null = document.querySelector(
    ".gantt-minimize-btn",
  );
  const maximizeBtn: Element | null = document.querySelector(
    ".gantt-maximize-btn",
  );

  if (minimizeBtn) {
    minimizeBtn.addEventListener("click", () => ganttChartInstance.minimize());
  }
  if (maximizeBtn) {
    maximizeBtn.addEventListener("click", () => ganttChartInstance.maximize());
  }

  console.log(
    "[InteractionHandler] Interaction event listeners (tooltips, etc.) set up.",
  );
}
