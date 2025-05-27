/**
 * Calculates the overall min and max dates from a list of items.
 * @param items Array of Item objects.
 * @param timelineMonths Default number of months for the timeline range if items are too few or narrow.
 * @returns An object containing the minDate and maxDate.
 */
export function calculateDateRange(items, timelineMonths = 12) {
    if (!items || items.length === 0) {
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() - 15); // Default to a small range around today
        const maxDate = new Date(today);
        maxDate.setMonth(today.getMonth() + timelineMonths);
        maxDate.setDate(maxDate.getDate() + 15);
        return { minDate, maxDate };
    }
    const timestamps = items.flatMap((item) => [
        new Date(item.start).getTime(),
        new Date(item.end).getTime(),
    ]);
    let taskMinDate = new Date(Math.min(...timestamps));
    let taskMaxDate = new Date(Math.max(...timestamps));
    // Add buffer
    const minDateWithBuffer = new Date(taskMinDate);
    minDateWithBuffer.setDate(taskMinDate.getDate() - 15);
    const maxDateWithBuffer = new Date(taskMaxDate);
    maxDateWithBuffer.setDate(taskMaxDate.getDate() + 15);
    // Ensure the range covers at least `timelineMonths`
    const currentRangeMonths = (maxDateWithBuffer.getTime() - minDateWithBuffer.getTime()) /
        (1000 * 60 * 60 * 24 * 30.44); // Avg days/month
    if (currentRangeMonths < timelineMonths) {
        const difference = timelineMonths - currentRangeMonths;
        maxDateWithBuffer.setMonth(maxDateWithBuffer.getMonth() + Math.ceil(difference));
    }
    return { minDate: minDateWithBuffer, maxDate: maxDateWithBuffer };
}
/**
 * Creates a scale function to map dates to x-coordinates
 * @param dateRange The overall min and max dates for the scale.
 * @param availableWidth The width available for drawing the timeline.
 * @param leftMargin The left margin of the chart area.
 * @returns A function that takes a Date and returns its x-coordinate.
 */
export function createXScale(dateRange, availableWidth, leftMargin) {
    const totalTimeRange = dateRange.maxDate.getTime() - dateRange.minDate.getTime();
    if (totalTimeRange <= 0 || availableWidth <= 0)
        return (_date) => leftMargin; // Avoid division by zero or negative width
    return (date) => {
        const datePositionRatio = (date.getTime() - dateRange.minDate.getTime()) / totalTimeRange;
        return leftMargin + datePositionRatio * availableWidth;
    };
}
// TODO: This is a simplified version. The original had more complex logic for choosing
// intervals. We'll need to expand this to match the original's dynamic interval selection based on zoom.
//
// A basic month/day setup.
// @param minVisibleDate The minimum date to show within the interval.
// @param maxVisibleDate The maximum date to show within the interval.
// @param availableWidth The container width available to fit the time interval.
export function getAppropriateTimeIntervals(minVisibleDate, maxVisibleDate) {
    const visibleDurationDays = (maxVisibleDate.getTime() - minVisibleDate.getTime()) /
        (1000 * 60 * 60 * 24);
    // Very basic logic, needs refinement based on original's pixelPerDay etc.
    if (visibleDurationDays > 365 * 2) {
        // More than 2 years -> show years
        return { primaryInterval: getYearInterval() };
    }
    else if (visibleDurationDays > 90) {
        // More than 3 months -> show months
        return {
            primaryInterval: getMonthInterval(),
            secondaryInterval: getDayInterval(true),
        };
    }
    else if (visibleDurationDays > 14) {
        // More than 2 weeks -> show weeks (and days)
        return {
            primaryInterval: getWeekInterval(),
            secondaryInterval: getDayInterval(),
        };
    }
    else {
        // Default to days (and potentially hours if very zoomed in)
        return {
            primaryInterval: getDayInterval(),
            secondaryInterval: getHourInterval(),
        };
    }
}
function getYearInterval() {
    return {
        unit: "year",
        labelFormat: { year: "numeric" },
        getTicks: (minDate, maxDate, xScale) => {
            const ticks = [];
            const current = new Date(minDate);
            current.setDate(1);
            current.setMonth(0); // Start of the year
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, { year: "numeric" }),
                });
                current.setFullYear(current.getFullYear() + 1);
            }
            return ticks;
        },
    };
}
function getMonthInterval() {
    return {
        unit: "month",
        labelFormat: { month: "long", year: "numeric" }, // For top header
        getTicks: (minDate, maxDate, xScale) => {
            const ticks = [];
            const current = new Date(minDate);
            current.setDate(1); // Start of the month
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                    }),
                });
                current.setMonth(current.getMonth() + 1);
            }
            return ticks;
        },
    };
}
function getWeekInterval() {
    return {
        unit: "week",
        labelFormat: { month: "short", day: "numeric" }, // Label for start of week
        getTicks: (minDate, maxDate, xScale) => {
            const ticks = [];
            const current = new Date(minDate);
            // Find the previous Monday (or current if it's Monday)
            const dayOfWeek = current.getDay(); // Sunday = 0, Monday = 1, ...
            current.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                    }),
                });
                current.setDate(current.getDate() + 7);
            }
            return ticks;
        },
    };
}
function getDayInterval(isSubTick = false) {
    return {
        unit: "day",
        labelFormat: isSubTick
            ? { day: "numeric" }
            : { month: "short", day: "numeric" },
        getTicks: (minDate, maxDate, xScale) => {
            const ticks = [];
            const current = new Date(minDate);
            current.setHours(0, 0, 0, 0); // Start of the day
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, isSubTick ? { day: "numeric" } : { month: "short", day: "numeric" }),
                });
                current.setDate(current.getDate() + 1);
            }
            return ticks;
        },
    };
}
function getHourInterval() {
    return {
        unit: "hour",
        labelFormat: { hour: "numeric", hour12: true },
        getTicks: (minDate, maxDate, xScale) => {
            const ticks = [];
            const current = new Date(minDate);
            current.setMinutes(0, 0, 0); // Start of the hour
            const intervalHours = 6; // Show ticks every 6 hours
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                    }),
                });
                current.setHours(current.getHours() + intervalHours);
            }
            return ticks;
        },
    };
}
console.log("[DateUtils] Loaded.");
