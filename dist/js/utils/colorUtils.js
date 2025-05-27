// Default color paletter (modern and accessible)
// Inspired by TailwindCSS v3 colors
const defaultPalette = {
    "1": "#38bdf8", // Sky 400 (Blue)
    "2": "#34d399", // Emerald 400 (Green)
    "3": "#fbbf24", // Amber 400 (Yellow/Orange)
    "4": "#f472b6", // Rose 400 (Pink)
    "5": "#a78bfa", // Violet 400 (Purple)
    default: "#9ca3af", // Gray 400 (Fallback)
};
/**
 * Gets the color for a given priority level
 * Uses the user-configured colors if provided, otherwise falls back to the default palette.
 * @param priority The priority number (e.g., 1.1, 2.0, 3.5).
 * @param configuredColors Optional user-defined colors from GanttConfig.
 * @returns The hex color string.
 */
export function getPriorityColor(priority, configuredColors) {
    const mainPriorityLevel = Math.floor(priority).toString();
    if (configuredColors && configuredColors[mainPriorityLevel]) {
        return configuredColors[mainPriorityLevel];
    }
    if (defaultPalette[mainPriorityLevel]) {
        return defaultPalette[mainPriorityLevel];
    }
    return defaultPalette["default"];
}
/**
 * Lightens or darkens a hex color by a given percentage.
 * @param color The hex color string (e.g., "#RRGGBB").
 * @param percent The percentage to lighten (positive) or darken (negative). E.g., 20 for 20% lighter, -20 for 20% darker.
 * @returns The new hex color string.
 */
export function lightenDarkenColor(color, percent) {
    let usePound = false;
    if (color.startsWith("#")) {
        color = color.slice(1);
        usePound = true;
    }
    const num = parseInt(color, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, Math.max(0, Math.round(r * (1 + percent / 100))));
    g = Math.min(255, Math.max(0, Math.round(g * (1 + percent / 100))));
    b = Math.min(255, Math.max(0, Math.round(b * (1 + percent / 100))));
    const newColor = `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return (usePound ? "#" : "") + newColor;
}
/**
 * Generates SVG gradient definitions for item bars based on priority colors.
 * @param configuredColors Optional user-defined colors from GanttConfig.
 * @returns An SVGElement containing <defs> with gradients.
 */
export function createSvgGradientDefs(configuredColors) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const prioritiesToDefine = Object.keys(defaultPalette).filter((p) => p !== "default");
    prioritiesToDefine.forEach((priorityKey) => {
        const baseColor = getPriorityColor(Number(priorityKey), configuredColors);
        const lighterColor = lightenDarkenColor(baseColor, 20); // 20% lighter for the gradient end
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", `gradient-priority-${priorityKey}`);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "100%"); // Horizontal gradient
        gradient.setAttribute("y2", "0%");
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", baseColor);
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", lighterColor);
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
    });
    console.log("[ColorUtils] SVG gradient definitions created.");
    return defs;
}
