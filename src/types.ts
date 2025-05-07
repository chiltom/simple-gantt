export interface Task {
  id: number;
  name: string;
  start: string;
  end: string;
  priority: number;
  task_list?: string[];
  [key: string]: any; // Allow any other necessary fields
}

export interface GanttConfig<T extends Task> {
  tooltipFields: (keyof T)[]; // Fields to show in tooltip
  timelineMonths?: number; // Number of months to display (default 12)
  showTaskList?: boolean; // Whether to show task list in tooltip
  colors?: {
    [priority: string]: string; // Custom colors for priority groups
  };
}
