import { getDefaultConfig } from "./config.js";
import { createDOMStructure } from "../ui/domSetup.js";
import { initializeTooltip, destroyTooltip } from "../ui/tooltip.js";
import { renderTable } from "../ui/tableRenderer.js";
import { renderSVGContent } from "../ui/renderer.js";
import { createSvgGradientDefs, getPriorityColor, } from "../utils/colorUtils.js";
import { calculateDateRange, createXScale, } from "../utils/dateUtils.js";
import { setupZoomControls, updateZoomLevelDisplay, } from "../eventHandlers/zoomHandler.js";
import { setupPanEvents } from "../eventHandlers/panHandler.js";
import { setupInteractionEvents } from "../eventHandlers/interactionHandler.js";
export class GanttChart {
    constructor(parentElementId, items, userConfig) {
        this.currentZoomLevel = 1;
        this.worldWidth = 2000; // Default conceptual width for the entire date range at 100% zoom.
        this.svgComputedHeight = 400; // Adjusted dynamically
        this.margins = { top: 50, right: 20, bottom: 30, left: 0 }; // SVG internal margins, left is 0 because table is separate
        this.config = { ...getDefaultConfig(), ...userConfig };
        this.items = this.preprocessItems(items);
        this.dom = createDOMStructure(parentElementId, this.config);
        this.overallDateRange = calculateDateRange(this.items, this.config.timelineMonths);
        // Calculate initial SVG width based on container (its 100% width)
        const daysInOverallRange = (this.overallDateRange.maxDate.getTime() -
            this.overallDateRange.minDate.getTime()) /
            (1000 * 60 * 60 * 24);
        this.worldWidth = Math.max(this.dom.svgContainer.clientWidth, daysInOverallRange * 30); // e.g. 30px per day as a base
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
    preprocessItems(items) {
        return items.map((item) => ({
            ...item,
            // Add a color property to each item for easier access in tooltips/rendering if needed
            color: getPriorityColor(item.priority, this.config.colors),
        }));
    }
    setupEventHandlers() {
        if (this.config.enableZoom && this.dom.controlsContainer) {
            setupZoomControls(this, this.dom.controlsContainer, this.dom.svgContainer);
            updateZoomLevelDisplay(this.currentZoomLevel);
        }
        if (this.config.enablePan) {
            setupPanEvents(this, this.dom.svgContainer);
        }
        setupInteractionEvents(this, this.dom.svgElement);
        // Synchronize vertical scroll between table and SVG container
        this.dom.tableContainer.addEventListener("scroll", () => {
            if (this.dom.svgContainer.scrollTop !== this.dom.tableContainer.scrollTop) {
                this.dom.svgContainer.scrollTop = this.dom.tableContainer.scrollTop;
            }
        });
        this.dom.svgContainer.addEventListener("scroll", () => {
            if (this.dom.tableContainer.scrollTop !== this.dom.svgContainer.scrollTop) {
                this.dom.tableContainer.scrollTop = this.dom.svgContainer.scrollTop;
            }
        });
    }
    render() {
        // 1. Update dimensions and scales
        const itemAreaHeight = this.items.length * (this.config.rowHeight || 40);
        this.svgComputedHeight =
            this.margins.top + itemAreaHeight + this.margins.bottom;
        this.dom.svgElement.setAttribute("height", this.svgComputedHeight.toString());
        this.dom.tableContainer.style.height = `${this.svgComputedHeight}px`; // Sync height
        this.dom.svgContainer.style.height = `${this.svgComputedHeight}px`;
        // Adjust viewBox height if it hasn't been zoomed vertically
        if (this.currentViewBox.height < this.svgComputedHeight &&
            this.currentZoomLevel === 1) {
            // Heuristic for initial or unzoomed state
            this.currentViewBox.height = Math.min(this.svgComputedHeight, this.dom.svgContainer.clientHeight || this.svgComputedHeight);
        }
        this.constrainViewBox(); // Apply constraints before updating SVG attribute
        this.updateSvgViewBox();
        // The xScale maps a date to a pixel value *within the current viewBox's coordinate system*.
        const xScale = createXScale(this.overallDateRange, this.worldWidth, 0 // Margins are handled inside drawing functions relative to their group
        );
        // 2. Render Table (Priority Badges)
        if (this.config.showPriorityColumn) {
            renderTable(this.dom.tableContainer, this.items, this.config, this.config.rowHeight || 40, itemAreaHeight, // Pass the height of just the items area
            this.margins.top);
        }
        // 3. Render SVG Content (Grid, Bars, Labels)
        renderSVGContent({
            svgContentGroup: this.dom.svgContentGroup,
            items: this.items,
            config: this.config,
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
    updateSvgViewBox() {
        this.dom.svgElement.setAttribute("viewBox", `${this.currentViewBox.x} ${this.currentViewBox.y} ${this.currentViewBox.width} ${this.currentViewBox.height}`);
    }
    getVisibleDateRange() {
        // Calculate what part of overallDateRange is visible in currentViewBox
        const totalDuration = this.overallDateRange.maxDate.getTime() -
            this.overallDateRange.minDate.getTime();
        if (totalDuration <= 0 || this.worldWidth <= 0)
            return this.overallDateRange;
        // How much of the total scrollable width is represented by the viewBox's x and width
        // This assumes the initial viewBox width (at zoom 1) covers the entire overallDateRange.
        // For a more accurate calculation, we need to know the total "world" width.
        // Let's assume the initial viewBox.width (at zoom 1) corresponds to the overallDateRange.
        // The actual scrollableWidth might be larger if we allow zooming out beyond initial range.
        // For simplicity now, assume currentViewBox.width at zoomLevel 1 covers overallDateRange.
        const viewPortStartTime = this.overallDateRange.minDate.getTime() +
            (this.currentViewBox.x / this.worldWidth) * totalDuration;
        const viewPortEndTime = this.overallDateRange.minDate.getTime() +
            ((this.currentViewBox.x + this.currentViewBox.width) / this.worldWidth) *
                totalDuration;
        return {
            minDate: new Date(Math.max(this.overallDateRange.minDate.getTime(), viewPortStartTime)),
            maxDate: new Date(Math.min(this.overallDateRange.maxDate.getTime(), viewPortEndTime)),
        };
    }
    // --- Public API Methods ---
    updateItems(newItems) {
        this.items = this.preprocessItems(newItems);
        this.overallDateRange = calculateDateRange(this.items, this.config.timelineMonths);
        // Potentially reset zoom/pan or adjust intelligently
        this.render();
    }
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        // Re-render if certain configs change
        this.render();
    }
    // --- Zoom and Pan Methods ---
    zoom(delta) {
        const svgRect = this.getSvgRect();
        if (!svgRect)
            return;
        // Simple center zoom
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;
        this.zoomAtPoint(delta, centerX, centerY); // isViewBoxPoint = true
    }
    zoomAtPoint(delta, screenMouseX, screenMouseY) {
        const targetViewBoxWidth = this.currentViewBox.width / (1 + delta);
        // Clamp targetViewBoxWidth: min = small portion of screen, max = worldWidth * some factor (e.g., 2 for 50% zoom out)
        const minViewBoxWidth = (this.dom.svgContainer.clientWidth || 300) * 0.1; // Zoom in to see 10% of screen width
        const maxViewBoxWidth = this.worldWidth * 2; // Zoom out to see twice the worldWidth
        const newViewBoxWidth = Math.max(minViewBoxWidth, Math.min(targetViewBoxWidth, maxViewBoxWidth));
        if (newViewBoxWidth === this.currentViewBox.width)
            return; // No change
        const actualZoomRatio = this.currentViewBox.width / newViewBoxWidth; // How much current view is scaled
        // Convert screen mouse coordinates to viewBox coordinates
        const currentSvgClientWidth = this.dom.svgElement.clientWidth || this.currentViewBox.width;
        const currentSvgClientHeight = this.dom.svgElement.clientHeight || this.currentViewBox.height;
        const pointXInViewBox = this.currentViewBox.x +
            screenMouseX * (this.currentViewBox.width / currentSvgClientWidth);
        const pointYInViewBox = this.currentViewBox.y +
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
    constrainViewBox() {
        // Max x: worldWidth - currentViewBox.width. Min x: 0.
        this.currentViewBox.x = Math.max(0, Math.min(this.currentViewBox.x, this.worldWidth - this.currentViewBox.width));
        if (this.currentViewBox.width > this.worldWidth) {
            // If zoomed out beyond world, center it
            this.currentViewBox.x = (this.worldWidth - this.currentViewBox.width) / 2;
        }
        // Max y: svgComputedHeight - currentViewBox.height. Min y: 0.
        this.currentViewBox.y = Math.max(0, Math.min(this.currentViewBox.y, this.svgComputedHeight - this.currentViewBox.height));
        if (this.currentViewBox.height > this.svgComputedHeight) {
            // If zoomed out vertically
            this.currentViewBox.y =
                (this.svgComputedHeight - this.currentViewBox.height) / 2;
        }
        // Ensure viewBox dimensions are not negative or zero if possible
        if (this.currentViewBox.width <= 0)
            this.currentViewBox.width = 1;
        if (this.currentViewBox.height <= 0)
            this.currentViewBox.height = 1;
    }
    resetZoom() {
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
    pan(dxScreen, dyScreen) {
        const currentSvgClientWidth = this.dom.svgElement.clientWidth || this.currentViewBox.width;
        const currentSvgClientHeight = this.dom.svgElement.clientHeight || this.currentViewBox.height;
        const dxViewBox = dxScreen * (this.currentViewBox.width / currentSvgClientWidth);
        const dyViewBox = dyScreen * (this.currentViewBox.height / currentSvgClientHeight); // Enable vertical pan
        this.currentViewBox.x -= dxViewBox;
        this.currentViewBox.y -= dyViewBox; // Apply vertical pan
        this.constrainViewBox();
        // updateSvgViewBox(); // Called in render
        this.render();
    }
    // --- Utility methods ---
    getSvgRect() {
        return this.dom.svgElement.getBoundingClientRect();
    }
    // --- Lifecycle ---
    destroy() {
        if (this.config.showTooltip) {
            destroyTooltip();
        }
        // Remove event listeners, clear intervals, remove DOM elements
        // (More thorough cleanup would be needed for a production library)
        this.dom.chartContainer.remove();
        console.log("[GanttChart] Destroyed.");
    }
    // --- Min/Max (Req 9 - Placeholders) ---
    minimize() {
        console.log("[GanttChart] minimize() called (placeholder).");
        this.dom.mainContentWrapper.style.display = "none";
        if (this.dom.controlsContainer)
            this.dom.controlsContainer.style.display = "none";
        // Potentially change title bar appearance
    }
    maximize() {
        console.log("[GanttChart] maximize() called (placeholder).");
        this.dom.mainContentWrapper.style.display = ""; // Or 'flex'
        if (this.dom.controlsContainer)
            this.dom.controlsContainer.style.display = ""; // Or 'flex'
        this.render(); // Re-render in case size changed
    }
}
