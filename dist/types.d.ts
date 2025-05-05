export interface Task {
    start: string;
    end: string;
    priority: number;
    [key: string]: any;
}
export interface GanttConfig<T extends Task> {
    nameField: keyof T;
    tooltipFields: (keyof T)[];
}
