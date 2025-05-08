export interface Task {
    id: number;
    priority: number;
    name: string;
    start: string;
    end: string;
    task_list?: string[];
    progress?: number;
    [key: string]: any;
}
export interface GanttConfig<T extends Task> {
    tooltipFields?: (keyof T)[];
    timelineMonths?: number;
    showTaskList?: boolean;
    colors?: {
        [priority: string]: string;
    };
    customTooltipRenderer?: (task: T) => string;
}
