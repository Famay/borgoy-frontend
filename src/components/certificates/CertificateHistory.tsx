import type { CertificateHistoryEntry } from "../../types/certificate";

interface CertificateHistoryProps {
  history: CertificateHistoryEntry[];
}

const actionLabels: Record<CertificateHistoryEntry["action"], string> = {
  CREATED: "Сертификат создан",
  STATUS_UPDATED: "Статус изменен",
  CANCELLED: "Сертификат аннулирован",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU");
}

function getActor(entry: CertificateHistoryEntry) {
  if (!entry.changedBy) {
    return "Система";
  }

  const role = entry.changedBy.role === "admin" ? "администратор" : "поставщик";

  return `${entry.changedBy.name} (${role})`;
}

export default function CertificateHistory({
  history,
}: CertificateHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <details className="certificate-history">
      <summary>История изменений ({history.length})</summary>

      <div className="certificate-history__list">
        {history.map((entry) => (
          <article className="certificate-history__item" key={entry.id}>
            <div className="certificate-history__header">
              <strong>{actionLabels[entry.action]}</strong>
              <time dateTime={entry.createdAt}>
                {formatDateTime(entry.createdAt)}
              </time>
            </div>

            <div>{entry.message}</div>
            <div className="certificate-history__meta">
              Автор: {getActor(entry)}
            </div>

            {entry.previousStatus && (
              <div className="certificate-history__meta">
                Статус: {entry.previousStatus} → {entry.nextStatus}
              </div>
            )}

            {!entry.previousStatus && (
              <div className="certificate-history__meta">
                Начальный статус: {entry.nextStatus}
              </div>
            )}

            {entry.reason && (
              <div className="certificate-history__reason">
                Причина: {entry.reason}
              </div>
            )}
          </article>
        ))}
      </div>
    </details>
  );
}
