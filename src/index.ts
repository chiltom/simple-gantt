// Placeholder types - these will be moved to core/item.ts and core/config.ts during refactoring
export interface Item {
  // Renamed from Task as per requirements
  id: number | string;
  priority: number;
  name: string;
  start: string; // ISO date string, e.g., "2024-01-15"
  end: string; // ISO date string
  progress?: number; // Percentage 0-100, as per requirement 5
  item_list?: string[]; // Renamed from task_list, as per requirement 4
  [key: string]: any; // Allow other fields for flexibility
}

export interface GanttConfig<T extends Item> {
  colors?: { [priority: string]: string }; // For requirement 3 (configurable colors by priority number)
  customTooltipRenderer?: (item: T) => string;
  // We will add more configuration options here as we implement features.
  // timelineMonths?: number; // from original
  // showTaskList?: boolean; // from original, now item_list
  // tooltipFields?: (keyof T)[]; // from original
}

// Dummy GanttChart class for initial setup
export class GanttChart<T extends Item> {
  private containerId: string;
  private items: T[];
  private config: GanttConfig<T>;
  private containerElement: HTMLElement | null;

  constructor(containerId: string, items: T[], config: GanttConfig<T>) {
    this.containerId = containerId;
    this.items = items;
    this.config = config;
    this.containerElement = document.getElementById(containerId);

    if (this.containerElement) {
      // Clear the container and show a placeholder message
      this.containerElement.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #555;">
          <h1>Gantt Chart Placeholder</h1>
          <p>Successfully initialized for container ID: <strong>${containerId}</strong></p>
          <p>Received <strong>${items.length}</strong> items.</p>
          <p>Initial configuration: <pre style="background-color: #f0f0f0; padding: 10px; border-radius: 4px; text-align: left; display: inline-block;">${JSON.stringify(config, null, 2)}</pre></p>
          <p><em>The actual Gantt chart rendering is pending implementation.</em></p>
        </div>
      `;
      console.log("Dummy GanttChart initialized for container:", containerId);
      console.log("Items received:", items);
      console.log("Config received:", config);
    } else {
      console.error(
        `[GanttChart Dummy] Container with ID '${containerId}' not found.`,
      );
      // Optionally, throw an error to be caught by the calling script in index.html
      throw new Error(`Container with ID '${containerId}' not found.`);
    }
  }

  // Dummy render method
  public render(): void {
    console.log("[GanttChart Dummy] render() called.");
    if (this.containerElement) {
      const p = document.createElement("p");
      p.textContent = "Dummy render method was called!";
      p.style.textAlign = "center";
      p.style.color = "green";
      this.containerElement.appendChild(p);
    }
  }
}

// Log to confirm that this script file (the entry point of our TS bundle) is loaded
console.log(
  "src/index.ts (Gantt Chart Library Entry Point) loaded successfully.",
);
