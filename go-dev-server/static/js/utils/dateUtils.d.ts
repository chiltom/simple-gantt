import type { Item } from "../core/item.js";
export interface DateRange {
    minDate: Date;
    maxDate: Date;
}
/**
 * Represents a single time marking for display on the timeline.
 */
export interface Tick {
    x: number;
    label: string;
    isMajor?: boolean;
}
/**
 * Represents a time interval for display on the timeline.
 */
export interface TimeInterval {
    unit: "year" | "month" | "week" | "day" | "hour";
    getTicks: (minDate: Date, maxDate: Date, xScale: (date: Date) => number, availableWidth: number) => Tick[];
    getHeaderLabel?: (minDate: Date, maxDate: Date) => string | null;
}
/**
 * Calculates the overall min and max dates from a list of items.
 * @param items Array of Item objects.
 * @param timelineMonths Default number of months for the timeline range if items are too few or narrow.
 * @returns An object containing the minDate and maxDate.
 */
export declare function calculateDateRange(items: Item[], timelineMonths?: number): DateRange;
/**
 * Creates a scale function to map dates to x-coordinates
 * @param dateRange The overall min and max dates for the scale.
 * @param availableWidth The width available for drawing the timeline.
 * @param leftMargin The left margin of the chart area.
 * @returns A function that takes a Date and returns its x-coordinate.
 */
export declare function createXScale(dateRange: DateRange, availableWidth: number, leftMargin: number): (date: Date) => number;
/**
 * Determines which time intervals to use for the Gantt Chart
 * dependent upon the provided date range.
 * @param minVisibleDate The minimum visible date for the scale.
 * @param maxVisibleDate The maximum visible date for the scale.
 * @param availableWidth The width available for the date interval drawing.
 * @returns Optional primary and secondary time intervals for the given dates.
 */
export declare function getAdaptiveTimeIntervals(minVisibleDate: Date, maxVisibleDate: Date, availableWidth: number): {
    primary?: TimeInterval;
    secondary?: TimeInterval;
};
