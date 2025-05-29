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

  private worldWidth: number = 2000; // Default conceptual width for the entire date range at 100% zoom.

  private svgComputedHeight: number = 400; // Adjusted dynamically

  private readonly margins = { top: 50, right: 20, bottom: 30, left: 0 }; // SVG internal margins, left is 0 because table is separate

  constructor(
    parentElementId: string,
    items: T[],
    userConfig?: Partial<GanttConfig<T>>
  ) {
    this.config = { ...getDefaultConfig<T>(), ...userConfig };
    this.items = this.preprocessItems(items);

    this.dom = createDOMStructure(parentElementId, this.config);

    this.overallDateRange = calculateDateRange(
      this.items,
      this.config.timelineMonths
    );

    // Calculate initial SVG width based on container (its 100% width)
    const daysInOverallRange: number =
      (this.overallDateRange.maxDate.getTime() -
        this.overallDateRange.minDate.getTime()) /
      (1000 * 60 * 60 * 24);
    this.worldWidth = Math.max(
      this.dom.svgContainer.clientWidth,
      daysInOverallRange * 30
    ); // e.g. 30px per day as a base

    this.currentViewBox = {
      x: 0,
      y: 0,
      width: this.dom.svgContainer.clientWidth || this.worldWidth / 2, // Initial viewbox width matches SVG width at zoom 1
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
        this.dom.svgContainer
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
    const itemAreaHeight: number =
      this.items.length * (this.config.rowHeight || 40);
    this.svgComputedHeight =
      this.margins.top + itemAreaHeight + this.margins.bottom;

    this.dom.svgElement.setAttribute(
      "height",
      this.svgComputedHeight.toString()
    );
    this.dom.tableContainer.style.height = `${this.svgComputedHeight}px`; // Sync height
    this.dom.svgContainer.style.height = `${this.svgComputedHeight}px`;

    // Adjust viewBox height if it hasn't been zoomed vertically
    if (
      this.currentViewBox.height < this.svgComputedHeight &&
      this.currentZoomLevel === 1
    ) {
      // Heuristic for initial or unzoomed state
      this.currentViewBox.height = Math.min(
        this.svgComputedHeight,
        this.dom.svgContainer.clientHeight || this.svgComputedHeight
      );
    }
    this.constrainViewBox(); // Apply constraints before updating SVG attribute
    this.updateSvgViewBox();

    // The xScale maps a date to a pixel value *within the current viewBox's coordinate system*.
    const xScale: (date: Date) => number = createXScale(
      this.overallDateRange,
      this.worldWidth,
      0 // Margins are handled inside drawing functions relative to their group
    );

    // 2. Render Table (Priority Badges)
    if (this.config.showPriorityColumn) {
      renderTable(
        this.dom.tableContainer,
        this.items,
        this.config,
        this.config.rowHeight || 40,
        itemAreaHeight, // Pass the height of just the items area
        this.margins.top
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
      containerWidth: this.worldWidth,
      containerHeight: this.svgComputedHeight,
      visibleDateRange: this.getVisibleDateRange(),
      margins: this.margins,
    });

    console.log("[GanttChart] Chart rendered (core structure).");
  }

  private updateSvgViewBox(): void {
    this.dom.svgElement.setAttribute(
      "viewBox",
      `${this.currentViewBox.x} ${this.currentViewBox.y} ${this.currentViewBox.width} ${this.currentViewBox.height}`
    );
  }

  private getVisibleDateRange(): DateRange {
    // Calculate what part of overallDateRange is visible in currentViewBox
    const totalDuration: number =
      this.overallDateRange.maxDate.getTime() -
      this.overallDateRange.minDate.getTime();
    if (totalDuration <= 0 || this.worldWidth <= 0)
      return this.overallDateRange;

    // How much of the total scrollable width is represented by the viewBox's x and width
    // This assumes the initial viewBox width (at zoom 1) covers the entire overallDateRange.
    // For a more accurate calculation, we need to know the total "world" width.
    // Let's assume the initial viewBox.width (at zoom 1) corresponds to the overallDateRange.
    // The actual scrollableWidth might be larger if we allow zooming out beyond initial range.
    // For simplicity now, assume currentViewBox.width at zoomLevel 1 covers overallDateRange.

    const viewPortStartTime: number =
      this.overallDateRange.minDate.getTime() +
      (this.currentViewBox.x / this.worldWidth) * totalDuration;
    const viewPortEndTime: number =
      this.overallDateRange.minDate.getTime() +
      ((this.currentViewBox.x + this.currentViewBox.width) / this.worldWidth) *
        totalDuration;

    return {
      minDate: new Date(
        Math.max(this.overallDateRange.minDate.getTime(), viewPortStartTime)
      ),
      maxDate: new Date(
        Math.min(this.overallDateRange.maxDate.getTime(), viewPortEndTime)
      ),
    };
  }

  // --- Public API Methods ---
  public updateItems(newItems: T[]): void {
    this.items = this.preprocessItems(newItems);
    this.overallDateRange = calculateDateRange(
      this.items,
      this.config.timelineMonths
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
    const svgRect: DOMRect | null = this.getSvgRect();
    if (!svgRect) return;
    // Simple center zoom
    const centerX: number = svgRect.width / 2;
    const centerY: number = svgRect.height / 2;
    this.zoomAtPoint(delta, centerX, centerY); // isViewBoxPoint = true
  }

  public zoomAtPoint(
    delta: number,
    screenMouseX: number,
    screenMouseY: number
  ): void {
    const targetViewBoxWidth: number = this.currentViewBox.width / (1 + delta);

    // Clamp targetViewBoxWidth: min = small portion of screen, max = worldWidth * some factor (e.g., 2 for 50% zoom out)
    const minViewBoxWidth: number =
      (this.dom.svgContainer.clientWidth || 300) * 0.1; // Zoom in to see 10% of screen width
    const maxViewBoxWidth: number = this.worldWidth * 2; // Zoom out to see twice the worldWidth

    const newViewBoxWidth: number = Math.max(
      minViewBoxWidth,
      Math.min(targetViewBoxWidth, maxViewBoxWidth)
    );
    if (newViewBoxWidth === this.currentViewBox.width) return; // No change

    const actualZoomRatio: number = this.currentViewBox.width / newViewBoxWidth; // How much current view is scaled

    // Convert screen mouse coordinates to viewBox coordinates
    const currentSvgClientWidth: number =
      this.dom.svgElement.clientWidth || this.currentViewBox.width;
    const currentSvgClientHeight: number =
      this.dom.svgElement.clientHeight || this.currentViewBox.height;

    const pointXInViewBox: number =
      this.currentViewBox.x +
      screenMouseX * (this.currentViewBox.width / currentSvgClientWidth);
    const pointYInViewBox: number =
      this.currentViewBox.y +
      screenMouseY * (this.currentViewBox.height / currentSvgClientHeight);

    this.currentViewBox.x =
      pointXInViewBox -
      (pointXInViewBox - this.currentViewBox.x) / actualZoomRatio;
    this.currentViewBox.y =
      pointYInViewBox -
      (pointYInViewBox - this.currentViewBox.y) / actualZoomRatio;
    this.currentViewBox.width = newViewBoxWidth;
    this.currentViewBox.height = this.currentViewBox.height / actualZoomRatio; // Zoom height proportionally

    this.currentZoomLevel = this.worldWidth / this.currentViewBox.width; // Update effective zoom level

    this.constrainViewBox();
    updateZoomLevelDisplay(this.currentZoomLevel);
    this.render();
  }

  private constrainViewBox(): void {
    // Max x: worldWidth - currentViewBox.width. Min x: 0.
    this.currentViewBox.x = Math.max(
      0,
      Math.min(
        this.currentViewBox.x,
        this.worldWidth - this.currentViewBox.width
      )
    );
    if (this.currentViewBox.width > this.worldWidth) {
      // If zoomed out beyond world, center it
      this.currentViewBox.x = (this.worldWidth - this.currentViewBox.width) / 2;
    }

    // Max y: svgComputedHeight - currentViewBox.height. Min y: 0.
    this.currentViewBox.y = Math.max(
      0,
      Math.min(
        this.currentViewBox.y,
        this.svgComputedHeight - this.currentViewBox.height
      )
    );
    if (this.currentViewBox.height > this.svgComputedHeight) {
      // If zoomed out vertically
      this.currentViewBox.y =
        (this.svgComputedHeight - this.currentViewBox.height) / 2;
    }
    // Ensure viewBox dimensions are not negative or zero if possible
    if (this.currentViewBox.width <= 0) this.currentViewBox.width = 1;
    if (this.currentViewBox.height <= 0) this.currentViewBox.height = 1;
  }

  public resetZoom(): void {
    this.currentViewBox = {
      x: 0,
      y: 0,
      width: this.dom.svgContainer.clientWidth || this.worldWidth / 2,
      height: this.dom.svgContainer.clientHeight || this.svgComputedHeight,
    };
    this.currentZoomLevel = this.worldWidth / this.currentViewBox.width;
    this.constrainViewBox(); // Ensure it's valid
    // updateSvgViewBox(); // Called in render
    updateZoomLevelDisplay(this.currentZoomLevel);
    this.render();
  }

  public pan(dxScreen: number, dyScreen: number): void {
    const currentSvgClientWidth: number =
      this.dom.svgElement.clientWidth || this.currentViewBox.width;
    const currentSvgClientHeight: number =
      this.dom.svgElement.clientHeight || this.currentViewBox.height;

    const dxViewBox: number =
      dxScreen * (this.currentViewBox.width / currentSvgClientWidth);
    const dyViewBox: number =
      dyScreen * (this.currentViewBox.height / currentSvgClientHeight); // Enable vertical pan

    this.currentViewBox.x -= dxViewBox;
    this.currentViewBox.y -= dyViewBox; // Apply vertical pan

    this.constrainViewBox();
    // updateSvgViewBox(); // Called in render
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
