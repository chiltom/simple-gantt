import type { Item } from "./item.js";
import type { GanttConfig } from "./config.js";
import { getDefaultConfig } from "./config.js";
import { createDOMStructure, DOMStructure } from "../ui/domSetup.js";
import { initializeTooltip, destroyTooltip } from "../ui/tooltip.js";
import { renderTable } from "../ui/tableRenderer.js";
import { renderSVGContent } from "../ui/renderer.js";
import {
  createSvgGradientDefs,
  getPriorityColor,
} from "../utils/colorUtils.js";
import {
  calculateDateRange,
  DateRange,
  createXScale,
} from "../utils/dateUtils.js";
import {
  setupZoomControls,
  updateZoomLevelDisplay,
} from "../eventHandlers/zoomHandler.js";
import { setupPanEvents } from "../eventHandlers/panHandler.js";
import { setupInteractionEvents } from "../eventHandlers/interactionHandler.js";

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class GanttChart<T extends Item> {
  public readonly config: GanttConfig<T>;
  private items: T[];
  private dom: DOMStructure;

  // State
  private overallDateRange: DateRange; // Min/max dates of all items
  private currentZoomLevel: number = 1;
  private currentViewBox: ViewBox;
  private svgInitialWidth: number = 1000; // Base width, will be adjusted
  private svgComputedHeight: number = 400; // Adjusted dynamically

  private readonly margins = { top: 50, right: 20, bottom: 30, left: 0 }; // SVG internal margins, left is 0 because table is separate

  constructor(
    parentElementId: string,
    items: T[],
    userConfig?: Partial<GanttConfig<T>>,
  ) {
    this.config = { ...getDefaultConfig<T>(), ...userConfig };
    this.items = this.preprocessItems(items);

    this.dom = createDOMStructure(parentElementId, this.config);

    // Calculate initial SVG width based on container (it's 100% width)
    this.svgInitialWidth =
      this.dom.svgContainer.clientWidth || this.svgInitialWidth;

    this.overallDateRange = calculateDateRange(
      this.items,
      this.config.timelineMonths,
    );

    this.currentViewBox = {
      x: 0,
      y: 0,
      width: this.svgInitialWidth, // Initial viewbox width matches SVG width at zoom 1
      height: this.svgComputedHeight, // Will be updated in render
    };

    this.dom.svgElement.appendChild(createSvgGradientDefs(this.config.colors));

    if (this.config.showTooltip) {
      initializeTooltip();
    }

    this.setupEventHandlers();

    this.render();
    console.log(`[GanttChart] Initialized for ${parentElementId}.`);
  }

  private preprocessItems(items: T[]): T[] {
    return items.map((item) => ({
      ...item,
      // Add a color property to each item for easier access in tooltips/rendering if needed
      color: getPriorityColor(item.priority, this.config.colors),
    }));
  }

  private setupEventHandlers(): void {
    if (this.config.enableZoom && this.dom.controlsContainer) {
      setupZoomControls(
        this,
        this.dom.controlsContainer,
        this.dom.svgContainer,
      );
      updateZoomLevelDisplay(this.currentZoomLevel);
    }
    if (this.config.enablePan) {
      setupPanEvents(this, this.dom.svgContainer);
    }
    setupInteractionEvents(this, this.dom.svgElement);

    // Synchronize vertical scroll between table and SVG container
    this.dom.tableContainer.addEventListener("scroll", () => {
      if (
        this.dom.svgContainer.scrollTop !== this.dom.tableContainer.scrollTop
      ) {
        this.dom.svgContainer.scrollTop = this.dom.tableContainer.scrollTop;
      }
    });
    this.dom.svgContainer.addEventListener("scroll", () => {
      if (
        this.dom.tableContainer.scrollTop !== this.dom.svgContainer.scrollTop
      ) {
        this.dom.tableContainer.scrollTop = this.dom.svgContainer.scrollTop;
      }
    });
  }

  public render(): void {
    // 1. Update dimensions and scales
    this.svgInitialWidth =
      this.dom.svgContainer.clientWidth || this.svgInitialWidth;
    this.svgComputedHeight =
      this.margins.top +
      this.items.length * (this.config.rowHeight || 40) +
      this.margins.bottom;

    this.dom.svgElement.setAttribute(
      "height",
      this.svgComputedHeight.toString(),
    );
    this.dom.tableContainer.style.maxHeight = `${this.svgComputedHeight}px`; // Sync height
    this.dom.svgContainer.style.maxHeight = `${this.svgComputedHeight}px`;

    // Adjust viewBox height if it hasn't been zoomed vertically
    if (this.currentViewBox.height === 400 || this.currentViewBox.y === 0) {
      // Heuristic for initial or unzoomed state
      this.currentViewBox.height = this.svgComputedHeight;
    }
    this.updateSvgViewBox();

    // Calculate available width for the timeline content inside SVG (respecting margins)
    const timelineContentWidth: number =
      this.currentViewBox.width - this.margins.left - this.margins.right;

    // Create xScale based on the current viewBox's representation of the overall date range
    // The xScale maps a date to a pixel value *within the current viewBox's coordinate system*.
    const xScale: (date: Date) => number = createXScale(
      this.getVisibleDateRange(), // Use visible date range for scaling within the view
      timelineContentWidth,
      this.margins.left, // Left margin within the SVG content area
    );

    // 2. Render Table (Priority Badges)
    if (this.config.showPriorityColumn) {
      renderTable(
        this.dom.tableContainer,
        this.items,
        this.config,
        this.config.rowHeight || 40,
      );
    }

    // 3. Render SVG Content (Grid, Bars, Labels)
    renderSVGContent({
      svgContentGroup: this.dom.svgContentGroup,
      items: this.items,
      config: this.config as GanttConfig<Item>,
      xScale: xScale,
      rowHeight: this.config.rowHeight || 40,
      barHeight: this.config.barHeight || 28,
      barPadding: this.config.padding || 6,
      containerWidth: this.currentViewBox.width, // Pass viewBox width as the drawing canvas width
      containerHeight: this.svgComputedHeight, // Total height of content
      visibleDateRange: this.getVisibleDateRange(),
      margins: this.margins,
    });

    console.log("[GanttChart] Chart rendered (core structure).");
  }

  private updateSvgViewBox(): void {
    this.dom.svgElement.setAttribute(
      "viewBox",
      `${this.currentViewBox.x} ${this.currentViewBox.y} ${this.currentViewBox.width} ${this.currentViewBox.height}`,
    );
  }

  private getVisibleDateRange(): DateRange {
    // Calculate what part of overallDateRange is visible in currentViewBox
    const totalDuration: number =
      this.overallDateRange.maxDate.getTime() -
      this.overallDateRange.minDate.getTime();
    if (totalDuration <= 0) return this.overallDateRange;

    // How much of the total scrollable width is represented by the viewBox's x and width
    // This assumes the initial viewBox width (at zoom 1) covers the entire overallDateRange.
    // For a more accurate calculation, we need to know the total "world" width.
    // Let's assume the initial viewBox.width (at zoom 1) corresponds to the overallDateRange.
    // The actual scrollableWidth might be larger if we allow zooming out beyond initial range.
    // For simplicity now, assume currentViewBox.width at zoomLevel 1 covers overallDateRange.

    const viewPortStartTime: number =
      this.overallDateRange.minDate.getTime() +
      (this.currentViewBox.x / this.svgInitialWidth) * totalDuration;
    const viewPortEndTime: number =
      viewPortStartTime +
      (this.currentViewBox.width / this.svgInitialWidth) * totalDuration;

    return {
      minDate: new Date(viewPortStartTime),
      maxDate: new Date(viewPortEndTime),
    };
  }

  // --- Public API Methods ---
  public updateItems(newItems: T[]): void {
    this.items = this.preprocessItems(newItems);
    this.overallDateRange = calculateDateRange(
      this.items,
      this.config.timelineMonths,
    );
    // Potentially reset zoom/pan or adjust intelligently
    this.render();
  }

  public updateConfig(newConfig: Partial<GanttConfig<T>>): void {
    Object.assign(this.config, newConfig);
    // Re-render if certain configs change
    this.render();
  }

  // --- Zoom and Pan Methods ---
  public zoom(delta: number): void {
    // Simple center zoom
    const centerX: number =
      this.currentViewBox.x + this.currentViewBox.width / 2;
    const centerY: number =
      this.currentViewBox.y + this.currentViewBox.height / 2;
    this.zoomAtPoint(delta, centerX, centerY, true); // isViewBoxPoint = true
  }

  public zoomAtPoint(
    delta: number,
    mouseX: number,
    mouseY: number,
    isViewBoxPoint: boolean = false,
  ): void {
    const newZoomLevel: number = Math.max(
      0.2,
      Math.min(5, this.currentZoomLevel + delta * this.currentZoomLevel),
    ); // Multiplicative zoom
    if (newZoomLevel === this.currentZoomLevel) return;

    const zoomFactor: number = newZoomLevel / this.currentZoomLevel;

    // Convert mouseX, mouseY to viewBox coordinates if they are screen coordinates
    let pointXInViewBox: number = mouseX;
    let pointYInViewBox: number = mouseY;

    if (!isViewBoxPoint) {
      // mouseX, mouseY are screen coordinates relative to SVG top-left
      pointXInViewBox =
        this.currentViewBox.x +
        mouseX * (this.currentViewBox.width / this.dom.svgElement.clientWidth);
      pointYInViewBox =
        this.currentViewBox.y +
        mouseY *
          (this.currentViewBox.height / this.dom.svgElement.clientHeight);
    }

    const newWidth: number = this.currentViewBox.width / zoomFactor;
    const newHeight: number = this.currentViewBox.height / zoomFactor;

    this.currentViewBox.x =
      pointXInViewBox - (pointXInViewBox - this.currentViewBox.x) / zoomFactor;
    this.currentViewBox.y =
      pointYInViewBox - (pointYInViewBox - this.currentViewBox.y) / zoomFactor;
    this.currentViewBox.width = newWidth;
    this.currentViewBox.height = newHeight;

    this.currentZoomLevel = newZoomLevel;

    // Constrain pan
    this.constrainViewBox();
    this.updateSvgViewBox();
    updateZoomLevelDisplay(this.currentZoomLevel);
    this.render(); // Re-render with new scale
  }

  private constrainViewBox(): void {
    // Max x assuming the content width is effectively svgInitialWidth (at zoom 1)
    // This needs to be more robust if content can be wider than initial view.
    const maxViewBoxX: number =
      this.svgInitialWidth - this.currentViewBox.width;
    const maxViewBoxY: number =
      this.svgComputedHeight - this.currentViewBox.height;

    this.currentViewBox.x = Math.max(
      0,
      Math.min(this.currentViewBox.x, maxViewBoxX < 0 ? 0 : maxViewBoxX),
    );
    this.currentViewBox.y = Math.max(
      0,
      Math.min(this.currentViewBox.y, maxViewBoxY < 0 ? 0 : maxViewBoxY),
    );
  }

  public resetZoom(): void {
    this.currentZoomLevel = 1;
    this.currentViewBox = {
      x: 0,
      y: 0,
      width: this.svgInitialWidth,
      height: this.svgComputedHeight, // Reset to full computed height
    };
    this.updateSvgViewBox();
    updateZoomLevelDisplay(this.currentZoomLevel);
    this.render();
  }

  public pan(dxScreen: number, dyScreen: number): void {
    // Convert screen pixel delta to viewBox coordinate delta
    const dxViewBox: number =
      dxScreen * (this.currentViewBox.width / this.dom.svgElement.clientWidth);
    // const dyViewBox: number = dyScreen * (this.currentViewBox.height / this.dom.svgElement.clientHeight); // If vertical pan needed

    this.currentViewBox.x -= dxViewBox;
    // this.currentViewBox.y -= dyViewBox;

    this.constrainViewBox();
    this.updateSvgViewBox();
    // No full re-render needed for pan, only if scales change, but for simplicity now:
    this.render();
  }

  // --- Utility methods ---
  public getSvgRect(): DOMRect | null {
    return this.dom.svgElement.getBoundingClientRect();
  }

  // --- Lifecycle ---
  public destroy(): void {
    if (this.config.showTooltip) {
      destroyTooltip();
    }
    // Remove event listeners, clear intervals, remove DOM elements
    // (More thorough cleanup would be needed for a production library)
    this.dom.chartContainer.remove();
    console.log("[GanttChart] Destroyed.");
  }

  // --- Min/Max (Req 9 - Placeholders) ---
  public minimize(): void {
    console.log("[GanttChart] minimize() called (placeholder).");
    this.dom.mainContentWrapper.style.display = "none";
    if (this.dom.controlsContainer)
      this.dom.controlsContainer.style.display = "none";
    // Potentially change title bar appearance
  }

  public maximize(): void {
    console.log("[GanttChart] maximize() called (placeholder).");
    this.dom.mainContentWrapper.style.display = ""; // Or 'flex'
    if (this.dom.controlsContainer)
      this.dom.controlsContainer.style.display = ""; // Or 'flex'
    this.render(); // Re-render in case size changed
  }
}
