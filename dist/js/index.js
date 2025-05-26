// Dummy GanttChart class for initial setup
export class GanttChart {
    constructor(containerId, items, config) {
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
        }
        else {
            console.error(`[GanttChart Dummy] Container with ID '${containerId}' not found.`);
            // Optionally, throw an error to be caught by the calling script in index.html
            throw new Error(`Container with ID '${containerId}' not found.`);
        }
    }
    // Dummy render method
    render() {
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
console.log("src/index.ts (Gantt Chart Library Entry Point) loaded successfully.");
