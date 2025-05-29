/* ===========================
 * Exported method definitions
 * ===========================
 */
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
/**
 * Determines which time intervals to use for the Gantt Chart
 * dependent upon the provided date range.
 * @param minVisibleDate The minimum visible date for the scale.
 * @param maxVisibleDate The maximum visible date for the scale.
 * @param availableWidth The width available for the date interval drawing.
 * @returns Optional primary and secondary time intervals for the given dates.
 */
export function getAdaptiveTimeIntervals(minVisibleDate, maxVisibleDate, availableWidth) {
    const visibleDurationMs = maxVisibleDate.getTime() - minVisibleDate.getTime();
    if (visibleDurationMs <= 0 || availableWidth <= 0)
        return {};
    const visibleDurationDays = visibleDurationMs / (1000 * 60 * 60 * 24);
    const pixelsPerDay = availableWidth / Math.max(1, visibleDurationDays);
    // Primary hierarchy: Year -> Month -> Week -> Day
    if (pixelsPerDay < 2) {
        // Very zoomed out, likely multiple years visible
        // Primary: Years, Secondary: Months (if space)
        const pixelsPerYear = pixelsPerDay * 365.25;
        if (pixelsPerYear / 12 > MIN_PIXELS_FOR_LABEL) {
            // If months under years have space
            return { primary: getYearInterval(), secondary: getMonthInterval() };
        }
        return { primary: getYearInterval() };
    }
    else if (pixelsPerDay < 25) {
        // Likely multiple months visible
        // Primary: Months, Secondary: Weeks (if space)
        const pixelsPerMonth = pixelsPerDay * 30.44;
        if (pixelsPerMonth / 4 > MIN_PIXELS_FOR_LABEL) {
            // If weeks under months have space
            return { primary: getMonthInterval(), secondary: getWeekInterval() };
        }
        return { primary: getMonthInterval() };
    }
    else if (pixelsPerDay < 100) {
        // Likely multiple days or weeks visible
        // Primary: Weeks, Secondary: Days (if space)
        const pixelsPerWeek = pixelsPerDay * 7;
        if (pixelsPerWeek / 7 > MIN_PIXELS_FOR_DAY_NUMBER) {
            // If days under weeks have space
            return { primary: getWeekInterval(), secondary: getDayInterval() };
        }
        return { primary: getWeekInterval() }; // Or just days if weeks are too cramped
    }
    else {
        // Days are clearly visible
        // Primary: Days. Secondary could be hours if extremely zoomed, or nothing.
        return { primary: getDayInterval() };
    }
}
/* =======================================================
 * Helper methods to grab appropriate time interval values
 * =======================================================
 */
const MIN_PIXELS_FOR_LABEL = 50; // Minimum space for a text label to be somewhat readable
const MIN_PIXELS_FOR_MAJOR_LABEL = 70;
const MIN_PIXELS_FOR_DAY_NUMBER = 20; // For just "1", "2", "3"
function getYearInterval() {
    return {
        unit: "year",
        getTicks: (minDate, maxDate, xScale, availableWidth) => {
            const ticks = [];
            const startYear = minDate.getFullYear();
            const endYear = maxDate.getFullYear();
            const yearSpan = endYear - startYear + 1;
            const pixelsPerYear = availableWidth / yearSpan;
            let yearStep = 1;
            if (pixelsPerYear < MIN_PIXELS_FOR_MAJOR_LABEL) {
                yearStep = Math.ceil(MIN_PIXELS_FOR_MAJOR_LABEL / pixelsPerYear);
            }
            for (let year = startYear; year <= endYear; year += yearStep) {
                const date = new Date(year, 0, 1); // January 1st of the year
                if (date > maxDate && ticks.length > 0)
                    break; // Don't add tick beyond maxDate if we already have one
                // Ensure first tick is not before minDate unless it's the only one
                if (date < minDate &&
                    year + yearStep > minDate.getFullYear() &&
                    year !== startYear)
                    continue;
                ticks.push({
                    x: xScale(date),
                    label: date.toLocaleDateString(undefined, { year: "numeric" }),
                    isMajor: true,
                });
            }
            return ticks;
        },
    };
}
function getMonthInterval() {
    return {
        unit: "month",
        getTicks: (minDate, maxDate, xScale, availableWidth) => {
            const ticks = [];
            const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            const totalMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                (maxDate.getMonth() - minDate.getMonth()) +
                1;
            const pixelsPerMonth = availableWidth / Math.max(1, totalMonths);
            let monthStep = 1;
            if (pixelsPerMonth < MIN_PIXELS_FOR_MAJOR_LABEL) {
                monthStep = Math.ceil(MIN_PIXELS_FOR_MAJOR_LABEL / pixelsPerMonth);
                if (monthStep > 6)
                    monthStep = 6; // Cap step to avoid too few labels (e.g., bi-annually)
                if (monthStep === 5 || monthStep === 7)
                    monthStep = 6; // Prefer even steps like 3, 6
                if (monthStep === 4)
                    monthStep = 3; // Prefer 3 over 4 for month steps
            }
            const labelFormat = pixelsPerMonth > 70
                ? { month: "long", year: "numeric" }
                : pixelsPerMonth > 40
                    ? { month: "short", year: "numeric" }
                    : { month: "short" };
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, labelFormat),
                    isMajor: true,
                });
                current.setMonth(current.getMonth() + monthStep);
                if (monthStep > 1 &&
                    current.getMonth() !== 0 &&
                    ticks.length > 0 &&
                    current > maxDate) {
                    // If stepping causes us to jump over maxDate, and we are not at Jan (year boundary)
                    // try to add the last month if it's not too close
                    const lastMonthDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
                    if (ticks.length === 0 ||
                        Math.abs(xScale(lastMonthDate) - ticks[ticks.length - 1].x) >
                            MIN_PIXELS_FOR_MAJOR_LABEL / 2) {
                        if (lastMonthDate <= maxDate) {
                            // Ensure it's not past maxDate
                            ticks.push({
                                x: xScale(lastMonthDate),
                                label: lastMonthDate.toLocaleDateString(undefined, labelFormat),
                                isMajor: true,
                            });
                        }
                    }
                    break;
                }
            }
            return ticks;
        },
    };
}
function getWeekInterval() {
    return {
        unit: "week",
        getTicks: (minDate, maxDate, xScale, availableWidth) => {
            const ticks = [];
            const current = new Date(minDate);
            current.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Start of the week (Monday)
            current.setHours(0, 0, 0, 0);
            const totalWeeks = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
            const pixelsPerWeek = availableWidth / Math.max(1, totalWeeks);
            let weekStep = 1;
            if (pixelsPerWeek < MIN_PIXELS_FOR_LABEL) {
                weekStep = Math.ceil(MIN_PIXELS_FOR_LABEL / pixelsPerWeek);
            }
            const labelFormat = {
                month: "short",
                day: "numeric",
            };
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, labelFormat),
                    isMajor: false, // Weeks are typically secondary to months
                });
                current.setDate(current.getDate() + 7 * weekStep);
            }
            return ticks;
        },
    };
}
function getDayInterval() {
    return {
        unit: "day",
        getTicks: (minDate, maxDate, xScale, availableWidth) => {
            const ticks = [];
            const current = new Date(minDate);
            current.setHours(0, 0, 0, 0);
            const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            const pixelsPerDay = availableWidth / Math.max(1, totalDays);
            let dayStep = 1;
            if (pixelsPerDay < MIN_PIXELS_FOR_DAY_NUMBER) {
                // Use smaller threshold for just day numbers
                dayStep = Math.ceil(MIN_PIXELS_FOR_DAY_NUMBER / pixelsPerDay);
                if (dayStep > 10)
                    dayStep = 10; // Cap step
            }
            // Show month only if dayStep is large, otherwise it's too noisy
            const labelFormat = dayStep > 3 || pixelsPerDay > 60
                ? { month: "short", day: "numeric" }
                : { day: "numeric" };
            while (current <= maxDate) {
                ticks.push({
                    x: xScale(current),
                    label: current.toLocaleDateString(undefined, labelFormat),
                    isMajor: false,
                });
                current.setDate(current.getDate() + dayStep);
            }
            return ticks;
        },
    };
}
console.log("[DateUtils] Loaded.");
