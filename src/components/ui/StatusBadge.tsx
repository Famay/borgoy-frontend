import type { CertificateStatus } from "../../types/certificate";

interface StatusBadgeProps {
  status: CertificateStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let className = "status-badge";

  if (status === "Подтвержден") {
    className += " status-badge--success";
  } else if (status === "На проверке") {
    className += " status-badge--warning";
  } else {
    className += " status-badge--danger";
  }

  return <span className={className}>{status}</span>;
}