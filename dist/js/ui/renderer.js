import { getAppropriateTimeIntervals, } from "../utils/dateUtils.js";
import { getPriorityColor, lightenDarkenColor } from "../utils/colorUtils.js";
/**
 * Main rendering function for the SVG part of the Gantt chart.
 * Clears previous content and draws grid, items, labels, etc.
 * @param context The rendering context.
 */
export function renderSVGContent(context) {
    const { svgContentGroup, items, config, xScale, rowHeight, containerWidth, containerHeight, visibleDateRange, margins, } = context;
    // Clear previous SVG content
    while (svgContentGroup.firstChild) {
        svgContentGroup.removeChild(svgContentGroup.firstChild);
    }
    // 1. Draw Grid Lines and Date Labels (Timeline Headers)
    drawTimelineHeaders(svgContentGroup, visibleDateRange.minDate, visibleDateRange.maxDate, xScale, containerWidth, margins, rowHeight * items.length + margins.top + margins.bottom);
    // 2. Draw Item Bars
    // Sort items by priority for rendering order
    const sortedItems = [...items].sort((a, b) => a.priority - b.priority);
    sortedItems.forEach((item, index) => {
        drawItemBar(svgContentGroup, item, index, config, xScale, rowHeight, context.barHeight, context.barPadding, margins);
    });
    // 3. Draw "Today" marker
    drawTodayMarker(svgContentGroup, xScale, margins.top, containerHeight - margins.bottom, visibleDateRange);
    console.log("[Renderer] SVG content rendered.");
}
function drawTimelineHeaders(svgGroup, minVisibleDate, maxVisibleDate, xScale, svgWidth, margins, totalChartHeight) {
    const headerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    headerGroup.setAttribute("class", "gantt-timeline-header");
    const { primaryInterval, secondaryInterval, } = getAppropriateTimeIntervals(minVisibleDate, maxVisibleDate);
    // Primary Ticks (e.g., Months)
    const primaryTicks = primaryInterval.getTicks(minVisibleDate, maxVisibleDate, xScale);
    primaryTicks.forEach((tick) => {
        // Vertical grid line for primary tick
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", tick.x.toString());
        line.setAttribute("x2", tick.x.toString());
        line.setAttribute("y1", (margins.top - 20).toString()); // Extend slightly above main labels
        line.setAttribute("y2", totalChartHeight.toString());
        line.setAttribute("class", `grid-line grid-line-${primaryInterval.unit}`);
        headerGroup.appendChild(line);
        // Label for primary tick
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", (tick.x + 5).toString()); // Position text slightly after the line
        text.setAttribute("y", (margins.top - 25).toString());
        text.setAttribute("class", `date-label date-label-${primaryInterval.unit}`);
        text.textContent = tick.label;
        headerGroup.appendChild(text);
    });
    // Secondary Ticks (e.g., Days or Weeks under Months)
    if (secondaryInterval && secondaryInterval.getSubTicks) {
        const subTicks = secondaryInterval.getSubTicks(minVisibleDate, maxVisibleDate, xScale);
        subTicks.forEach((tick) => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", tick.x.toString());
            line.setAttribute("x2", tick.x.toString());
            line.setAttribute("y1", margins.top.toString());
            line.setAttribute("y2", totalChartHeight.toString());
            line.setAttribute("class", `grid-line grid-line-secondary grid-line-${secondaryInterval.unit}`);
            headerGroup.appendChild(line);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", (tick.x + 3).toString());
            text.setAttribute("y", (margins.top - 5).toString()); // Position below primary labels
            text.setAttribute("class", `date-label date-label-secondary date-label-${secondaryInterval.unit}`);
            text.textContent = tick.label;
            headerGroup.appendChild(text);
        });
    }
    else if (secondaryInterval) {
        // Fallback if getSubTicks is not defined, use getTicks
        const secondaryTicks = secondaryInterval.getTicks(minVisibleDate, maxVisibleDate, xScale);
        secondaryTicks.forEach((tick) => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", tick.x.toString());
            line.setAttribute("x2", tick.x.toString());
            line.setAttribute("y1", margins.top.toString());
            line.setAttribute("y2", totalChartHeight.toString());
            line.setAttribute("class", `grid-line grid-line-secondary grid-line-${secondaryInterval.unit}`);
            headerGroup.appendChild(line);
            // Avoid label overlap if primary interval is already very granular (e.g. days)
            if (primaryInterval.unit !== secondaryInterval.unit) {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", (tick.x + 3).toString());
                text.setAttribute("y", (margins.top - 5).toString());
                text.setAttribute("class", `date-label date-label-secondary date-label-${secondaryInterval.unit}`);
                text.textContent = tick.label;
                headerGroup.appendChild(text);
            }
        });
    }
    svgGroup.appendChild(headerGroup);
}
function drawItemBar(svgGroup, item, itemIndex, config, xScale, rowHeight, barHeight, barPadding, margins) {
    const itemGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    itemGroup.setAttribute("class", "gantt-item-group");
    // Add data attributes for easier selection/debugging or for interaction handler
    itemGroup.dataset.itemId = String(item.id);
    const y = margins.top + itemIndex * rowHeight + barPadding;
    const startDate = new Date(item.start);
    const endDate = new Date(item.end);
    const x = xScale(startDate);
    const barEndX = xScale(endDate);
    let width = barEndX - x;
    if (width < 0)
        width = 0; // Should not happen with valid dates
    // Main item bar background (full width of the bar)
    const barRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    barRect.setAttribute("x", x.toString());
    barRect.setAttribute("y", y.toString());
    barRect.setAttribute("width", width.toString());
    barRect.setAttribute("height", barHeight.toString());
    barRect.setAttribute("rx", "3"); // Rounded corners
    barRect.setAttribute("ry", "3");
    barRect.setAttribute("class", `gantt-item-bar priority-${Math.floor(item.priority)}`);
    // Use gradient to fill based on priority
    const priorityKey = Math.floor(item.priority).toString();
    barRect.style.fill = `url(#gradient-priority-${priorityKey})`;
    // Store item reference for interaction handler
    barRect.__ganttItem = item;
    itemGroup.appendChild(barRect);
    // Progress shading
    if (item.progress !== undefined &&
        item.progress >= 0 &&
        item.progress <= 100 &&
        width > 0) {
        const progressWidth = (item.progress / 100) * width;
        const progressRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        progressRect.setAttribute("x", x.toString());
        progressRect.setAttribute("y", y.toString());
        progressRect.setAttribute("width", progressWidth.toString());
        progressRect.setAttribute("height", barHeight.toString());
        progressRect.setAttribute("rx", "3");
        progressRect.setAttribute("ry", "3");
        progressRect.setAttribute("class", "gantt-item-progress-fill");
        // Use a darker shade of the item's base color for progress
        const baseColor = getPriorityColor(item.priority, config.colors);
        progressRect.style.fill = lightenDarkenColor(baseColor, -20); // 20% darker
        progressRect.style.opacity = "0.7"; // Make it slightly transparent or use a pattern
        itemGroup.appendChild(progressRect);
    }
    // Text on the bar (Item name)
    const textPadding = 5;
    const availableTextWidth = width - 2 * textPadding;
    if (availableTextWidth > 10) {
        // Only show text if there's some space
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", (x + textPadding).toString());
        text.setAttribute("y", (y + barHeight / 2).toString());
        text.setAttribute("dy", "0.35em"); // Vertical alignment
        text.setAttribute("class", "gantt-item-name");
        text.textContent = item.name;
        // Truncate text if too long (simple truncation)
        // A more sophisticated approach would mesaure text width
        const charWidthApproximation = 8; // Very rough guess
        if (item.name.length * charWidthApproximation > availableTextWidth) {
            const maxChars = Math.floor(availableTextWidth / charWidthApproximation);
            if (maxChars > 3) {
                text.textContent = item.name.substring(0, maxChars - 3) + "...";
            }
            else {
                text.textContent = ""; // Too small to show even ellipsis
            }
        }
        itemGroup.appendChild(text);
    }
    // Date range on bar if space permits
    const dateRangeTextWidthApproximation = 100; // Approx width for "MMM DD - MMM DD"
    if (width > dateRangeTextWidthApproximation + item.name.length * 8 + 20) {
        // Ensure it doesn't overlap name
        const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        dateText.setAttribute("x", (x + width - textPadding).toString());
        dateText.setAttribute("y", (y + barHeight / 2).toString());
        dateText.setAttribute("dy", "0.35em");
        dateText.setAttribute("text-anchor", "end");
        dateText.setAttribute("class", "gantt-item-date-range");
        const startStr = startDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
        const endStr = endDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
        dateText.textContent = `${startStr} - ${endStr}`;
        itemGroup.appendChild(dateText);
    }
    svgGroup.appendChild(itemGroup);
}
function drawTodayMarker(svgGroup, xScale, topY, bottomY, visibleDateRange) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
    if (today >= visibleDateRange.minDate && today <= visibleDateRange.maxDate) {
        const todayX = xScale(today);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", todayX.toString());
        line.setAttribute("x2", todayX.toString());
        line.setAttribute("y1", (topY - 20).toString()); // Extend slightly above chart area
        line.setAttribute("y2", bottomY.toString());
        line.setAttribute("class", "today-marker-line");
        svgGroup.appendChild(line);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", todayX.toString());
        text.setAttribute("y", (topY - 25).toString()); // Position above the line
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "today-marker-label");
        text.textContent = "Today";
        svgGroup.appendChild(text);
    }
}
console.log("[Renderer] Loaded.");
