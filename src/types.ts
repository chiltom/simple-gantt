export interface Task {
  id: number;
  priority: number;
  name: string;
  start: string;
  end: string;
  task_list?: string[];
  progress?: number;
  [key: string]: any; // Allow any other necessary fields
}

export interface GanttConfig<T extends Task> {
  tooltipFields?: (keyof T)[]; // Fields to show in tooltip (optional now)
  timelineMonths?: number; // Number of months to display (default 12)
  showTaskList?: boolean; // Whether to show task list in tooltip
  colors?: {
    [priority: string]: string; // Custom colors for priority groups
  };
  customTooltipRenderer?: (task: T) => string; // Custom tooltip renderer function
}
