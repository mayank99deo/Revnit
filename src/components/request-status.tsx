import type { RequestStatus } from "@/lib/types";

const STATUS: Record<RequestStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "border border-edge text-graphite" },
  planned: { label: "Planned", className: "bg-blue-soft text-blue-deep" },
  in_progress: { label: "Modelling", className: "bg-yellow-soft text-yellow-ink" },
  shipped: { label: "Published", className: "bg-green-soft text-green" },
  declined: { label: "Declined", className: "bg-red-soft text-red" },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = STATUS[status];
  return <span className={`tag ${className}`}>{label}</span>;
}
