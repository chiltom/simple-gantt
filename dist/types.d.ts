export interface Task {
    id: number;
    name: string;
    start: string;
    end: string;
    priority: number;
    task_list?: string[];
    [key: string]: any;
}
export interface GanttConfig<T extends Task> {
    tooltipFields: (keyof T)[];
    timelineMonths?: number;
    showTaskList?: boolean;
    colors?: {
        [priority: string]: string;
    };
}
