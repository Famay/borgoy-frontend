import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../app/AuthContext";
import { getAuditLogsRequest, type AuditLogEntry } from "../services/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function AdminLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      setLogs(await getAuditLogsRequest(token, 120));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить журнал аудита"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadLogs]);

  return (
    <section className="page">
      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Журнал аудита</h2>
            <p className="section-subtitle">
              Действия пользователей, загрузки сертификатов и публичные проверки.
            </p>
          </div>
          <button
            className="button button--secondary"
            onClick={() => void loadLogs()}
            disabled={isLoading}
          >
            {isLoading ? "Обновление..." : "Обновить"}
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Событие</th>
                <th>Пользователь</th>
                <th>Сущность</th>
                <th>Сообщение</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="mono-text">{formatDateTime(log.createdAt)}</td>
                  <td>
                    <div className="table-main">{log.actionLabel}</div>
                    <div className="table-sub">{log.action}</div>
                  </td>
                  <td>
                    <div className="table-main">
                      {log.user?.name ?? "Система"}
                    </div>
                    <div className="table-sub">{log.user?.email ?? "-"}</div>
                  </td>
                  <td>
                    <div className="table-main">{log.entity}</div>
                    <div className="table-sub">{log.entityId ?? "-"}</div>
                  </td>
                  <td>{log.message}</td>
                </tr>
              ))}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5}>Журнал пока пуст.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
