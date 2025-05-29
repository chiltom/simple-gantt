import type { Item } from "../core/item.js";

/* ==============================================
 * {@code type} and {@code interface} definitions
 * ==============================================
 */

/*
 * Represents a date range for the Gantt Chart
 */
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
  isMajor?: boolean; // For styling major vs. minor ticks if needed
}

/**
 * Represents a time interval for display on the timeline.
 */
export interface TimeInterval {
  unit: "year" | "month" | "week" | "day" | "hour";
  getTicks: (
    minDate: Date,
    maxDate: Date,
    xScale: (date: Date) => number,
    availableWidth: number,
  ) => Tick[];
  getHeaderLabel?: (minDate: Date, maxDate: Date) => string | null;
}

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
export function calculateDateRange(
  items: Item[],
  timelineMonths: number = 12,
): DateRange {
  if (!items || items.length === 0) {
    const today: Date = new Date();
    const minDate: Date = new Date(today);
    minDate.setDate(today.getDate() - 15); // Default to a small range around today
    const maxDate: Date = new Date(today);
    maxDate.setMonth(today.getMonth() + timelineMonths);
    maxDate.setDate(maxDate.getDate() + 15);
    return { minDate, maxDate };
  }

  const timestamps: number[] = items.flatMap((item) => [
    new Date(item.start).getTime(),
    new Date(item.end).getTime(),
  ]);

  let taskMinDate: Date = new Date(Math.min(...timestamps));
  let taskMaxDate: Date = new Date(Math.max(...timestamps));

  // Add buffer
  const minDateWithBuffer: Date = new Date(taskMinDate);
  minDateWithBuffer.setDate(taskMinDate.getDate() - 15);

  const maxDateWithBuffer: Date = new Date(taskMaxDate);
  maxDateWithBuffer.setDate(taskMaxDate.getDate() + 15);

  // Ensure the range covers at least `timelineMonths`
  const currentRangeMonths: number =
    (maxDateWithBuffer.getTime() - minDateWithBuffer.getTime()) /
    (1000 * 60 * 60 * 24 * 30.44); // Avg days/month
  if (currentRangeMonths < timelineMonths) {
    const difference: number = timelineMonths - currentRangeMonths;
    maxDateWithBuffer.setMonth(
      maxDateWithBuffer.getMonth() + Math.ceil(difference),
    );
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
export function createXScale(
  dateRange: DateRange,
  availableWidth: number,
  leftMargin: number,
): (date: Date) => number {
  const totalTimeRange: number =
    dateRange.maxDate.getTime() - dateRange.minDate.getTime();

  if (totalTimeRange <= 0 || availableWidth <= 0)
    return (_date: Date) => leftMargin; // Avoid division by zero or negative width

  return (date: Date): number => {
    const datePositionRatio: number =
      (date.getTime() - dateRange.minDate.getTime()) / totalTimeRange;
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
export function getAdaptiveTimeIntervals(
  minVisibleDate: Date,
  maxVisibleDate: Date,
  availableWidth: number,
): { primary?: TimeInterval; secondary?: TimeInterval } {
  const visibleDurationMs: number =
    maxVisibleDate.getTime() - minVisibleDate.getTime();
  if (visibleDurationMs <= 0 || availableWidth <= 0) return {};

  const visibleDurationDays: number = visibleDurationMs / (1000 * 60 * 60 * 24);
  const pixelsPerDay: number =
    availableWidth / Math.max(1, visibleDurationDays);

  // Primary hierarchy: Year -> Month -> Week -> Day
  if (pixelsPerDay < 2) {
    // Very zoomed out, likely multiple years visible
    // Primary: Years, Secondary: Months (if space)
    const pixelsPerYear: number = pixelsPerDay * 365.25;
    if (pixelsPerYear / 12 > MIN_PIXELS_FOR_LABEL) {
      // If months under years have space
      return { primary: getYearInterval(), secondary: getMonthInterval() };
    }
    return { primary: getYearInterval() };
  } else if (pixelsPerDay < 25) {
    // Likely multiple months visible
    // Primary: Months, Secondary: Weeks (if space)
    const pixelsPerMonth: number = pixelsPerDay * 30.44;
    if (pixelsPerMonth / 4 > MIN_PIXELS_FOR_LABEL) {
      // If weeks under months have space
      return { primary: getMonthInterval(), secondary: getWeekInterval() };
    }
    return { primary: getMonthInterval() };
  } else if (pixelsPerDay < 100) {
    // Likely multiple days or weeks visible
    // Primary: Weeks, Secondary: Days (if space)
    const pixelsPerWeek: number = pixelsPerDay * 7;
    if (pixelsPerWeek / 7 > MIN_PIXELS_FOR_DAY_NUMBER) {
      // If days under weeks have space
      return { primary: getWeekInterval(), secondary: getDayInterval() };
    }
    return { primary: getWeekInterval() }; // Or just days if weeks are too cramped
  } else {
    // Days are clearly visible
    // Primary: Days. Secondary could be hours if extremely zoomed, or nothing.
    return { primary: getDayInterval() };
  }
}

/* =======================================================
 * Helper methods to grab appropriate time interval values
 * =======================================================
 */

const MIN_PIXELS_FOR_LABEL: number = 50; // Minimum space for a text label to be somewhat readable
const MIN_PIXELS_FOR_MAJOR_LABEL: number = 70;
const MIN_PIXELS_FOR_DAY_NUMBER: number = 20; // For just "1", "2", "3"

function getYearInterval(): TimeInterval {
  return {
    unit: "year",
    getTicks: (minDate, maxDate, xScale, availableWidth) => {
      const ticks: Tick[] = [];
      const startYear: number = minDate.getFullYear();
      const endYear: number = maxDate.getFullYear();
      const yearSpan: number = endYear - startYear + 1;
      const pixelsPerYear: number = availableWidth / yearSpan;

      let yearStep: number = 1;
      if (pixelsPerYear < MIN_PIXELS_FOR_MAJOR_LABEL) {
        yearStep = Math.ceil(MIN_PIXELS_FOR_MAJOR_LABEL / pixelsPerYear);
      }

      for (let year: number = startYear; year <= endYear; year += yearStep) {
        const date: Date = new Date(year, 0, 1); // January 1st of the year
        if (date > maxDate && ticks.length > 0) break; // Don't add tick beyond maxDate if we already have one
        // Ensure first tick is not before minDate unless it's the only one
        if (
          date < minDate &&
          year + yearStep > minDate.getFullYear() &&
          year !== startYear
        )
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

function getMonthInterval(): TimeInterval {
  return {
    unit: "month",
    getTicks: (minDate, maxDate, xScale, availableWidth) => {
      const ticks: Tick[] = [];
      const current: Date = new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        1,
      );
      const totalMonths: number =
        (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
        (maxDate.getMonth() - minDate.getMonth()) +
        1;
      const pixelsPerMonth: number = availableWidth / Math.max(1, totalMonths);

      let monthStep: number = 1;
      if (pixelsPerMonth < MIN_PIXELS_FOR_MAJOR_LABEL) {
        monthStep = Math.ceil(MIN_PIXELS_FOR_MAJOR_LABEL / pixelsPerMonth);
        if (monthStep > 6) monthStep = 6; // Cap step to avoid too few labels (e.g., bi-annually)
        if (monthStep === 5 || monthStep === 7) monthStep = 6; // Prefer even steps like 3, 6
        if (monthStep === 4) monthStep = 3; // Prefer 3 over 4 for month steps
      }

      const labelFormat: Intl.DateTimeFormatOptions =
        pixelsPerMonth > 70
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
        if (
          monthStep > 1 &&
          current.getMonth() !== 0 &&
          ticks.length > 0 &&
          current > maxDate
        ) {
          // If stepping causes us to jump over maxDate, and we are not at Jan (year boundary)
          // try to add the last month if it's not too close
          const lastMonthDate: Date = new Date(
            maxDate.getFullYear(),
            maxDate.getMonth(),
            1,
          );
          if (
            ticks.length === 0 ||
            Math.abs(xScale(lastMonthDate) - ticks[ticks.length - 1].x) >
              MIN_PIXELS_FOR_MAJOR_LABEL / 2
          ) {
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

function getWeekInterval(): TimeInterval {
  return {
    unit: "week",
    getTicks: (minDate, maxDate, xScale, availableWidth) => {
      const ticks: Tick[] = [];
      const current: Date = new Date(minDate);
      current.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Start of the week (Monday)
      current.setHours(0, 0, 0, 0);

      const totalWeeks: number =
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
      const pixelsPerWeek: number = availableWidth / Math.max(1, totalWeeks);

      let weekStep: number = 1;
      if (pixelsPerWeek < MIN_PIXELS_FOR_LABEL) {
        weekStep = Math.ceil(MIN_PIXELS_FOR_LABEL / pixelsPerWeek);
      }

      const labelFormat: Intl.DateTimeFormatOptions = {
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

function getDayInterval(): TimeInterval {
  return {
    unit: "day",
    getTicks: (minDate, maxDate, xScale, availableWidth) => {
      const ticks: Tick[] = [];
      const current: Date = new Date(minDate);
      current.setHours(0, 0, 0, 0);

      const totalDays: number =
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
      const pixelsPerDay: number = availableWidth / Math.max(1, totalDays);

      let dayStep: number = 1;
      if (pixelsPerDay < MIN_PIXELS_FOR_DAY_NUMBER) {
        // Use smaller threshold for just day numbers
        dayStep = Math.ceil(MIN_PIXELS_FOR_DAY_NUMBER / pixelsPerDay);
        if (dayStep > 10) dayStep = 10; // Cap step
      }

      // Show month only if dayStep is large, otherwise it's too noisy
      const labelFormat: Intl.DateTimeFormatOptions =
        dayStep > 3 || pixelsPerDay > 60
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
