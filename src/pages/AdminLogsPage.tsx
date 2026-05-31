import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../app/AuthContext";
import {
  getAuditLogsRequest,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditLogPagination,
} from "../services/api";

const actionOptions = [
  ["", "Все действия"],
  ["USER_REGISTERED", "Регистрация пользователя"],
  ["USER_STATUS_UPDATED", "Изменение статуса поставщика"],
  ["USER_LOGIN", "Вход в систему"],
  ["USER_LOGIN_2FA_FAILED", "Ошибка второго фактора"],
  ["BATCH_CREATED", "Создание партии"],
  ["CERTIFICATE_UPLOADED", "Загрузка сертификата"],
  ["CERTIFICATE_STATUS_UPDATED", "Изменение статуса сертификата"],
  ["CERTIFICATE_CANCELLED", "Аннулирование сертификата"],
  ["CERTIFICATE_VERIFIED", "Публичная проверка"],
  ["VERIFICATION_FAILED", "Ошибка проверки"],
] as const;

const defaultFilters: AuditLogFilters = {
  page: 1,
  pageSize: 25,
  action: "",
  entity: "",
  user: "",
  dateFrom: "",
  dateTo: "",
};

const defaultPagination: AuditLogPagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function AdminLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<AuditLogFilters>(defaultFilters);
  const [pagination, setPagination] =
    useState<AuditLogPagination>(defaultPagination);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await getAuditLogsRequest(token, appliedFilters);

      setLogs(result.logs);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить журнал аудита"
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, token]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters({ ...filters, page: 1 });
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const setPage = (page: number) => {
    setAppliedFilters((current) => ({ ...current, page }));
  };

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

        <form className="audit-log-filters" onSubmit={handleSubmit}>
          <select
            value={filters.action}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                action: event.target.value,
              }))
            }
          >
            {actionOptions.map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            value={filters.entity}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                entity: event.target.value,
              }))
            }
            placeholder="Сущность: Certificate, User..."
          />

          <input
            value={filters.user}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                user: event.target.value,
              }))
            }
            placeholder="Пользователь: имя или email"
          />

          <label>
            <span>От</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span>До</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span>На странице</span>
            <select
              value={filters.pageSize}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  pageSize: Number(event.target.value),
                }))
              }
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>

          <div className="actions-row audit-log-filters__actions">
            <button className="button button--primary" type="submit">
              Применить
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={handleReset}
            >
              Сбросить
            </button>
          </div>
        </form>

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

        <div className="audit-log-pagination">
          <span>
            Всего записей: {pagination.total}. Страница {pagination.page} из{" "}
            {Math.max(pagination.totalPages, 1)}.
          </span>
          <div className="actions-row">
            <button
              className="button button--secondary"
              onClick={() => setPage(pagination.page - 1)}
              disabled={isLoading || pagination.page <= 1}
            >
              Назад
            </button>
            <button
              className="button button--secondary"
              onClick={() => setPage(pagination.page + 1)}
              disabled={
                isLoading ||
                pagination.totalPages === 0 ||
                pagination.page >= pagination.totalPages
              }
            >
              Далее
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
