export type WorkflowFilter =
  | "no_truck"
  | "no_container"
  | "loading_pending"
  | "loaded"
  | "return_pending";

/** Per-shipment field-presence conditions for each workflow filter. */
export function buildWorkflowConditions(workflow: string): Record<string, unknown> | null {
  switch (workflow) {
    case "no_truck":
      return { $or: [{ truck_plate: { $exists: false } }, { truck_plate: null }, { truck_plate: "" }] };
    case "no_container":
      return { $or: [{ container_no: { $exists: false } }, { container_no: null }, { container_no: "" }] };
    case "loading_pending":
      return {
        loaded_at: { $in: [null, ""] },
        truck_plate: { $nin: [null, ""] },
        container_no: { $nin: [null, ""] },
      };
    case "loaded":
      return { loaded_at: { $nin: [null, ""] } };
    case "return_pending":
      return {
        loaded_at: { $nin: [null, ""] },
        return_completed: { $ne: true },
        return_date: { $in: [null, ""] },
      };
    default:
      return null;
  }
}

/** Workflows where a booking with zero shipments still counts as matching ("nothing assigned yet"). */
const MATCHES_EMPTY_SHIPMENTS = new Set(["no_truck", "no_container"]);

/** Match stage for the grouped (booking + $lookup shipments) aggregation — matches if at least one shipment matches. */
export function buildGroupedWorkflowMatch(workflow: string): Record<string, unknown> | null {
  const conditions = buildWorkflowConditions(workflow);
  if (!conditions) return null;

  const elemMatch = { shipments: { $elemMatch: conditions } };
  if (MATCHES_EMPTY_SHIPMENTS.has(workflow)) {
    return { $or: [{ shipments: { $size: 0 } }, elemMatch] };
  }
  return elemMatch;
}
