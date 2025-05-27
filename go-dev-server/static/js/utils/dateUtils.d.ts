import type { Item } from "../core/item.js";
export interface DateRange {
    minDate: Date;
    maxDate: Date;
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
 * Represents a time interval for display on the timeline.
 */
export interface TimeInterval {
    unit: "year" | "month" | "week" | "day" | "hour";
    labelFormat: Intl.DateTimeFormatOptions;
    getTicks: (minDate: Date, maxDate: Date, xScale: (date: Date) => number) => {
        x: number;
        label: string;
    }[];
    getSubTicks?: (minDate: Date, maxDate: Date, xScale: (date: Date) => number) => {
        x: number;
        label: string;
    }[];
}
export declare function getAppropriateTimeIntervals(minVisibleDate: Date, maxVisibleDate: Date): {
    primaryInterval: TimeInterval;
    secondaryInterval?: TimeInterval;
};
