import type { Task, GanttConfig } from "./types";
export declare class GanttChart<T extends Task> {
    private svg;
    private tasks;
    private config;
    private width;
    private height;
    private margin;
    private scrollableWidth;
    private tableContainer;
    private chartContainer;
    constructor(containerId: string, tasks: T[], config: GanttConfig<T>);
    private addSvgDefs;
    private lightenColor;
    private render;
    private getPriorityColor;
}
