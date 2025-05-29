import type { Item } from "../core/item.js";
import type { GanttConfig } from "../core/config.js";
import { getPriorityColor } from "../utils/colorUtils.js";

/**
 * Renders the table part of the Gantt chart (e.g., item names, priority badges).
 * For this version, it will only render priority badges without task names.
 * @param tableContainer The element that will contain the table.
 * @param items The array of items to render.
 * @param config The Gantt chart configuration.
 * @param rowHeight The height of each row, to align with SVG.
 * @param totalItemAreaHeight The height of the entire item area.
 * @param topMargin The top margin to apply, matching SVG.
 */
export function renderTable<T extends Item>(
  tableContainer: HTMLDivElement,
  items: T[], // Items should be pre-sorted if a specific order is always needed
  config: GanttConfig<T>,
  rowHeight: number,
  totalItemAreaHeight: number,
  topMargin: number
): void {
  tableContainer.innerHTML = ""; // Clear previous content

  if (!config.showPriorityColumn) {
    tableContainer.style.display = "none";
    return;
  }
  tableContainer.style.display = ""; // Ensure visible if previously hidden

  // Sort items by priority for grouped display (if not already sorted)
  const sortedItems: T[] = [...items].sort((a, b) => a.priority - b.priority);

  // Create a container for all table rows
  const tableRowsContainer: HTMLDivElement = document.createElement("div");
  tableRowsContainer.className = "gantt-table-rows-container";
  tableRowsContainer.style.paddingTop = `${topMargin}px`;
  tableRowsContainer.style.height = `${topMargin + totalItemAreaHeight}px`;
  // The tableContainer itself has {@code overflowY: hidden}, scroll is driven by svgContainer.

  sortedItems.forEach((item) => {
    const rowElement: HTMLDivElement = document.createElement("div");
    rowElement.className = "gantt-table-row-item";
    rowElement.style.height = `${rowHeight}px`;
    rowElement.style.display = "flex";
    rowElement.style.alignItems = "center";
    rowElement.style.borderBottom =
      "1px solid var(--gantt-table-border, #e5e7eb)";
    rowElement.style.boxSizing = "border-box";

    // Priority badge cell
    const priorityCell: HTMLDivElement = document.createElement("div");
    priorityCell.className = "gantt-priority-cell";
    priorityCell.style.flex = "1"; // Take full width of the narrow tableContainer
    priorityCell.style.display = "flex";
    priorityCell.style.justifyContent = "center";
    priorityCell.style.alignItems = "center";
    priorityCell.style.padding = "0 5px";

    const priorityBadge: HTMLSpanElement = document.createElement("span");
    priorityBadge.className = "priority-badge";
    priorityBadge.style.backgroundColor = getPriorityColor(
      item.priority,
      config.colors
    );
    priorityBadge.textContent = item.priority.toFixed(1);

    priorityCell.appendChild(priorityBadge);
    rowElement.appendChild(priorityCell);
    tableRowsContainer.appendChild(rowElement);
  });

  tableContainer.appendChild(tableRowsContainer);
  console.log("[TableRenderer] Table rendered with priority badges.");
}
