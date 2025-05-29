import type { Item } from "../core/item.js";
import type { GanttConfig } from "../core/config.js";
import type { DateRange, TimeInterval } from "../utils/dateUtils.js";
import type { Tick } from "../utils/dateUtils.js";
import { getAdaptiveTimeIntervals } from "../utils/dateUtils.js";
import { getPriorityColor, lightenDarkenColor } from "../utils/colorUtils.js";

interface RenderContext {
  svgContentGroup: SVGGElement;
  items: Item[];
  config: GanttConfig<Item>;
  xScale: (date: Date) => number;
  rowHeight: number;
  barHeight: number;
  barPadding: number;
  containerWidth: number; // Width of the SVG container
  containerHeight: number; // Height of the SVG container (current total height)
  visibleDateRange: DateRange; // The currently visible min/max dates based on zoom/pan
  margins: { top: number; right: number; bottom: number; left: number };
}

/**
 * Main rendering function for the SVG part of the Gantt chart.
 * Clears previous content and draws grid, items, labels, etc.
 * @param context The rendering context.
 */
export function renderSVGContent(context: RenderContext): void {
  const {
    svgContentGroup,
    items,
    config,
    xScale,
    rowHeight,
    containerWidth,
    containerHeight,
    visibleDateRange,
    margins,
  }: RenderContext = context;

  // Clear previous SVG content
  while (svgContentGroup.firstChild) {
    svgContentGroup.removeChild(svgContentGroup.firstChild);
  }

  // 1. Draw Grid Lines and Date Labels (Timeline Headers)
  const visibleTimelineWidth: number =
    visibleDateRange.maxDate.getTime() === visibleDateRange.minDate.getTime()
      ? containerWidth // Avoid division by zero if range is zero
      : xScale(visibleDateRange.maxDate) - xScale(visibleDateRange.minDate);
  drawTimelineHeaders(
    svgContentGroup,
    visibleDateRange.minDate,
    visibleDateRange.maxDate,
    xScale,
    visibleTimelineWidth,
    margins,
    rowHeight * items.length + margins.top + margins.bottom,
  );

  // 2. Draw Item Bars
  // Sort items by priority for rendering order
  const sortedItems: Item[] = [...items].sort(
    (a, b) => a.priority - b.priority,
  );
  sortedItems.forEach((item, index) => {
    drawItemBar(
      svgContentGroup,
      item,
      index,
      config,
      xScale,
      rowHeight,
      context.barHeight,
      context.barPadding,
      margins,
    );
  });

  // 3. Draw "Today" marker
  drawTodayMarker(
    svgContentGroup,
    xScale,
    margins.top,
    containerHeight - margins.bottom,
    visibleDateRange,
  );

  console.log("[Renderer] SVG content rendered.");
}

function drawTimelineHeaders(
  svgGroup: SVGGElement,
  minVisibleDate: Date,
  maxVisibleDate: Date,
  xScale: (date: Date) => number,
  timelineDrawingWidth: number,
  margins: RenderContext["margins"],
  totalChartHeight: number,
): void {
  const headerGroup: SVGGElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  headerGroup.setAttribute("class", "gantt-timeline-header");

  const {
    primary,
    secondary,
  }: {
    primary?: TimeInterval | undefined;
    secondary?: TimeInterval | undefined;
  } = getAdaptiveTimeIntervals(
    minVisibleDate,
    maxVisibleDate,
    timelineDrawingWidth,
  );

  let lastPrimaryLabelEndX: number = -Infinity;
  let lastSecondaryLabelEndX: number = -Infinity;
  const labelPadding: number = 5; // Pixels between labels

  // Primary Ticks (e.g., Months)
  if (primary) {
    const primaryTicks: Tick[] = primary.getTicks(
      minVisibleDate,
      maxVisibleDate,
      xScale,
      timelineDrawingWidth,
    );
    primaryTicks.forEach((tick) => {
      // Vertical grid line for primary tick
      const line: SVGLineElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", tick.x.toString());
      line.setAttribute("x2", tick.x.toString());
      line.setAttribute("y1", (margins.top - 20).toString()); // Extend slightly above main labels
      line.setAttribute("y2", totalChartHeight.toString());
      line.setAttribute("class", `grid-line grid-line-${primary.unit}`);
      headerGroup.appendChild(line);

      // Estimate label width (very rough, proper way is to render, measure, then decide)
      const estimatedLabelWidth: number = tick.label.length * 7; // Approx 7px per char for primary
      if (
        tick.x - estimatedLabelWidth / 2 >
          lastPrimaryLabelEndX + labelPadding ||
        primaryTicks.length === 1
      ) {
        const text: SVGTextElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        text.setAttribute("x", tick.x.toString()); // Centered on the tick
        text.setAttribute("y", (margins.top - 25).toString()); // Position for primary labels
        text.setAttribute(
          "class",
          `date-label date-label-primary date-label-${primary.unit}`,
        );
        text.setAttribute("text-anchor", "middle");
        text.textContent = tick.label;
        headerGroup.appendChild(text);
        // After appending could getBBox(), but that's slow in a loop.
        // For now, using estimation for `lastPrimaryLabelEndX`.
        lastPrimaryLabelEndX = tick.x + estimatedLabelWidth / 2;
      }
    });
  }

  // Secondary Ticks (e.g., Days or Weeks under Months)
  if (secondary) {
    const secondaryTicks: Tick[] = secondary.getTicks(
      minVisibleDate,
      maxVisibleDate,
      xScale,
      timelineDrawingWidth,
    );
    secondaryTicks.forEach((tick) => {
      // Draw vertical grid line for secondary tick (often thinner or dashed)
      const line: SVGLineElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", tick.x.toString());
      line.setAttribute("x2", tick.x.toString());
      line.setAttribute("y1", margins.top.toString()); // Secondary labels are lower
      line.setAttribute("y2", totalChartHeight.toString());
      line.setAttribute(
        "class",
        `grid-line grid-line-secondary grid-line-${secondary.unit}`,
      );
      headerGroup.appendChild(line);

      // Estimate label width
      const estimatedLabelWidth: number = tick.label.length * 6; // Approx 6px per char for secondary
      if (
        tick.x - estimatedLabelWidth / 2 >
          lastSecondaryLabelEndX + labelPadding ||
        secondaryTicks.length === 1
      ) {
        const text: SVGTextElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        text.setAttribute("x", tick.x.toString()); // Centered
        text.setAttribute("y", (margins.top - 5).toString()); // Position below primary labels
        text.setAttribute(
          "class",
          `date-label date-label-secondary date-label-${secondary.unit}`,
        );
        text.setAttribute("text-anchor", "middle");
        text.textContent = tick.label;
        headerGroup.appendChild(text);
        lastSecondaryLabelEndX = tick.x + estimatedLabelWidth / 2;
      }
    });
  }
  svgGroup.appendChild(headerGroup);
}

function drawItemBar(
  svgGroup: SVGGElement,
  item: Item,
  itemIndex: number,
  config: GanttConfig<Item>,
  xScale: (date: Date) => number,
  rowHeight: number,
  barHeight: number,
  barPadding: number,
  margins: RenderContext["margins"],
): void {
  const itemGroup: SVGGElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  itemGroup.setAttribute("class", "gantt-item-group");
  // Add data attributes for easier selection/debugging or for interaction handler
  itemGroup.dataset.itemId = String(item.id);

  const y: number = margins.top + itemIndex * rowHeight + barPadding;
  const startDate: Date = new Date(item.start);
  const endDate: Date = new Date(item.end);

  const x: number = xScale(startDate);
  const barEndX: number = xScale(endDate);
  let width: number = barEndX - x;

  if (width < 1) width = 1; // Ensure bar is at least 1px for visibility, even if dates are same

  // Main item bar background (full width of the bar)
  const barRect: SVGRectElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  barRect.setAttribute("x", x.toString());
  barRect.setAttribute("y", y.toString());
  barRect.setAttribute("width", width.toString());
  barRect.setAttribute("height", barHeight.toString());
  barRect.setAttribute("rx", "3"); // Rounded corners
  barRect.setAttribute("ry", "3");
  barRect.setAttribute(
    "class",
    `gantt-item-bar priority-${Math.floor(item.priority)}`,
  );
  // Use gradient to fill based on priority
  const priorityKey: string = Math.floor(item.priority).toString();
  barRect.style.fill = `url(#gradient-priority-${priorityKey})`;
  // Store item reference for interaction handler
  (barRect as any).__ganttItem = item;
  itemGroup.appendChild(barRect);

  // Progress shading
  if (
    item.progress !== undefined &&
    item.progress >= 0 &&
    item.progress <= 100 &&
    width > 0
  ) {
    const progressWidth: number = (item.progress / 100) * width;
    const progressRect: SVGRectElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    progressRect.setAttribute("x", x.toString());
    progressRect.setAttribute("y", y.toString());
    progressRect.setAttribute("width", progressWidth.toString());
    progressRect.setAttribute("height", barHeight.toString());
    progressRect.setAttribute("rx", "3");
    progressRect.setAttribute("ry", "3");
    progressRect.setAttribute("class", "gantt-item-progress-fill");
    // Use a darker shade of the item's base color for progress
    const baseColor: string = getPriorityColor(item.priority, config.colors);
    progressRect.style.fill = lightenDarkenColor(baseColor, -20); // 20% darker
    progressRect.style.opacity = "0.7"; // Make it slightly transparent or use a pattern
    itemGroup.appendChild(progressRect);
  }

  // Text on the bar (Item name)
  const textPadding: number = 4;
  const minWidthForAnyText: number = 5; // Minimum bar width to even consider showing text
  const minWidthForEllipsis: number = 15; // Minimum bar width for ellipsis "..."
  const charWidthApproximation: number = 7;
  if (width >= minWidthForAnyText) {
    // Only show text if there's some space
    const text: SVGTextElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    text.setAttribute("x", (x + textPadding).toString());
    text.setAttribute("y", (y + barHeight / 2).toString());
    text.setAttribute("dy", "0.35em"); // Vertical alignment
    text.setAttribute("class", "gantt-item-name");
    text.textContent = item.name;

    const availableTextPixelWidth: number = width - 2 * textPadding;
    let displayText: string = item.name;

    if (item.name.length * charWidthApproximation > availableTextPixelWidth) {
      if (availableTextPixelWidth >= minWidthForEllipsis) {
        // Enough space for "X..."
        const maxChars: number = Math.floor(
          (availableTextPixelWidth - charWidthApproximation * 2) /
            charWidthApproximation,
        ); // Reserve space for "...";
        displayText = item.name.substring(0, Math.max(1, maxChars)) + "...";
      } else {
        displayText = ""; // Not enough space even for a decent ellipsis
      }
    }

    if (displayText) {
      text.textContent = displayText;
      itemGroup.appendChild(text);
    }
  }

  // Date range on bar if space permits
  const dateRangeTextWidthApproximation: number = 120; // Approx width for "MMM DD - MMM DD"
  if (width > dateRangeTextWidthApproximation) {
    // Ensure it doesn't overlap name
    const dateText: SVGTextElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    dateText.setAttribute("x", (x + width - textPadding).toString());
    dateText.setAttribute("y", (y + barHeight / 2).toString());
    dateText.setAttribute("dy", "0.35em");
    dateText.setAttribute("text-anchor", "end");
    dateText.setAttribute("class", "gantt-item-date-range");
    const startStr: string = startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endStr: string = endDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    dateText.textContent = `${startStr} - ${endStr}`;
    itemGroup.appendChild(dateText);
  }

  svgGroup.appendChild(itemGroup);
}

function drawTodayMarker(
  svgGroup: SVGGElement,
  xScale: (date: Date) => number,
  topY: number,
  bottomY: number,
  visibleDateRange: DateRange,
): void {
  const today: Date = new Date();
  today.setHours(0, 0, 0, 0); // Compare dates only

  if (today >= visibleDateRange.minDate && today <= visibleDateRange.maxDate) {
    const todayX: number = xScale(today);

    const line: SVGLineElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    line.setAttribute("x1", todayX.toString());
    line.setAttribute("x2", todayX.toString());
    line.setAttribute("y1", (topY - 20).toString()); // Extend slightly above chart area
    line.setAttribute("y2", bottomY.toString());
    line.setAttribute("class", "today-marker-line");
    svgGroup.appendChild(line);

    const text: SVGTextElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    text.setAttribute("x", todayX.toString());
    text.setAttribute("y", (topY - 25).toString()); // Position above the line
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "today-marker-label");
    text.textContent = "Today";
    svgGroup.appendChild(text);
  }
}

console.log("[Renderer] Loaded.");
