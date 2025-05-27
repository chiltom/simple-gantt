/**
 * Represents a single item to be displayed on the Gantt chart.
 */
export interface Item {
    id: number | string;
    priority: number;
    name: string;
    start: string;
    end: string;
    progress?: number;
    item_list?: string[];
    [key: string]: any;
}
