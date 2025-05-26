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
export interface GanttConfig<T extends Item> {
    colors?: {
        [priority: string]: string;
    };
    customTooltipRenderer?: (item: T) => string;
}
export declare class GanttChart<T extends Item> {
    private containerId;
    private items;
    private config;
    private containerElement;
    constructor(containerId: string, items: T[], config: GanttConfig<T>);
    render(): void;
}
