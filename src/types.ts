export interface Task {
  start: string;
  end: string;
  priority: number;
  [key: string]: any; // Allow any other necessary fields
}

export interface GanttConfig<T extends Task> {
  nameField: keyof T; // Field to display on task bar
  tooltipFields: (keyof T)[]; // Fields to show in tooltip
  timelineMonths?: number; // Number of months to display (default 12)
}
