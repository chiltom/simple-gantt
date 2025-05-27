/**
 * Represents a single item to be displayed on the Gantt chart.
 */
export interface Item {
  id: number | string; // Unique identifier for the item
  priority: number; // Priority of the item, used for sorting and coloring
  name: string; // Name of the item
  start: string; // Start date of the item (ISO date string, e.g., "2024-01-15")
  end: string; // End date of the item (ISO date string)
  progress?: number; // Optional: Completion progress as a percentage (0-100)
  item_list?: string[]; // Optional: A list of sub-items or details
  [key: string]: any; // Allows for additional custom fields
}
