import { getPriorityColor } from "../utils/colorUtils.js";
/**
 * Renders the table part of the Gantt chart (e.g., item names, priority badges).
 * For this version, it will only render priority badges without task names.
 * @param tableContainer The {@code HTMLDivElement} that will contain the table.
 * @param items The array of items to render.
 * @param config The Gantt chart configuration.
 * @param rowHeight The height of each row, to align with SVG.
 */
export function renderTable(tableContainer, items, // Items should be pre-sorted if a specific order is always needed
config, rowHeight) {
    tableContainer.innerHTML = ""; // Clear previous content
    if (!config.showPriorityColumn) {
        tableContainer.style.display = "none";
        return;
    }
    tableContainer.style.display = ""; // Ensure visible if previously hidden
    // Sort items by priority for grouped display (if not already sorted)
    const sortedItems = [...items].sort((a, b) => a.priority - b.priority);
    // Create a container for all table rows
    const tableRowsContainer = document.createElement("div");
    tableRowsContainer.className = "gantt-table-rows-container";
    // This container's height should match the SVG content height for synchronized scrolling.
    // The GanttChart class will manage overall height synchronization.
    sortedItems.forEach((item) => {
        const rowElement = document.createElement("div");
        rowElement.className = "gantt-table-row-item";
        rowElement.style.height = `${rowHeight}px`;
        rowElement.style.display = "flex";
        rowElement.style.alignItems = "center";
        rowElement.style.borderBottom =
            "1px solid var(--gantt-table-border, #e5e7eb)";
        rowElement.style.boxSizing = "border-box";
        // Priority badge cell
        const priorityCell = document.createElement("div");
        priorityCell.className = "gantt-priority-cell";
        priorityCell.style.flex = "1"; // Take full width of the narrow tableContainer
        priorityCell.style.display = "flex";
        priorityCell.style.justifyContent = "center";
        priorityCell.style.alignItems = "center";
        priorityCell.style.padding = "0 5px";
        const priorityBadge = document.createElement("span");
        priorityBadge.className = "priority-badge";
        priorityBadge.style.backgroundColor = getPriorityColor(item.priority, config.colors);
        priorityBadge.textContent = item.priority.toFixed(1);
        priorityCell.appendChild(priorityBadge);
        rowElement.appendChild(priorityCell);
        tableRowsContainer.appendChild(rowElement);
    });
    tableContainer.appendChild(tableRowsContainer);
    console.log("[TableRenderer] Table rendered with priority badges.");
}
