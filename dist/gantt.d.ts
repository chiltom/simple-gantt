import { Task, GanttConfig } from "./types";
export declare class GanttChart<T extends Task> {
    private svg;
    private tasks;
    private config;
    private width;
    private height;
    private margin;
    constructor(containerId: string, tasks: T[], config: GanttConfig<T>);
    private render;
}
