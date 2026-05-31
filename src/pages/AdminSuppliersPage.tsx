import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../app/AuthContext";
import {
  getAdminSuppliersRequest,
  getAdminSystemStatusRequest,
  updateSupplierStatusRequest,
  type AdminSupplier,
  type AdminSupplierFilters,
  type AdminSupplierStatus,
  type AdminSupplierSummary,
  type ListPagination,
} from "../services/api";

const statusOptions: AdminSupplierStatus[] = ["ACTIVE", "PENDING", "BLOCKED"];

const statusLabels: Record<AdminSupplierStatus, string> = {
  ACTIVE: "Активен",
  PENDING: "Ожидает",
  BLOCKED: "Заблокирован",
};

const defaultFilters: AdminSupplierFilters = {
  page: 1,
  pageSize: 10,
  query: "",
  status: "",
};

const defaultPagination: ListPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
};

const defaultSummary: AdminSupplierSummary = {
  suppliersTotal: 0,
  activeSuppliers: 0,
  blockedSuppliers: 0,
  supplierCertificatesTotal: 0,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
  }).format(new Date(value));
}

function getStatusClass(status: AdminSupplierStatus) {
  if (status === "ACTIVE") {
    return "status-badge status-badge--success";
  }

  if (status === "PENDING") {
    return "status-badge status-badge--warning";
  }

  return "status-badge status-badge--danger";
}

export default function AdminSuppliersPage() {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [filters, setFilters] = useState<AdminSupplierFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<AdminSupplierFilters>(defaultFilters);
  const [pagination, setPagination] =
    useState<ListPagination>(defaultPagination);
  const [summary, setSummary] =
    useState<AdminSupplierSummary>(defaultSummary);
  const [processingId, setProcessingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [registryCertificatesTotal, setRegistryCertificatesTotal] = useState(0);

  const loadSuppliers = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const [supplierResult, systemStatus] = await Promise.all([
        getAdminSuppliersRequest(token, appliedFilters),
        getAdminSystemStatusRequest(token),
      ]);

      setSuppliers(supplierResult.suppliers);
      setPagination(supplierResult.pagination);
      setSummary(supplierResult.summary);
      setRegistryCertificatesTotal(systemStatus.counts.certificatesTotal);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить поставщиков"
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSuppliers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSuppliers]);

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

  const handleStatusChange = async (
    supplier: AdminSupplier,
    status: AdminSupplierStatus
  ) => {
    if (!token || supplier.status === status) {
      return;
    }

    setProcessingId(supplier.id);
    setError("");
    setMessage("");

    try {
      await updateSupplierStatusRequest(supplier.id, status, token);
      await loadSuppliers();
      setMessage(
        `Статус поставщика ${supplier.email} изменен на ${statusLabels[status]}.`
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось изменить статус поставщика"
      );
    } finally {
      setProcessingId("");
    }
  };

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">Поставщики</h1>
          <p className="section-subtitle">
            Управление учетными записями поставщиков, их статусами и активностью
            в реестре.
          </p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => void loadSuppliers()}
          disabled={isLoading}
        >
          {isLoading ? "Обновление..." : "Обновить"}
        </button>
      </div>

      <div className="stats admin-summary-grid">
        <div className="card stat-card">
          <div className="stat-card__label">Всего поставщиков</div>
          <div className="stat-card__value">{summary.suppliersTotal}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Активные</div>
          <div className="stat-card__value">{summary.activeSuppliers}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Заблокированные</div>
          <div className="stat-card__value">{summary.blockedSuppliers}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Сертификаты</div>
          <div className="stat-card__value">
            {summary.supplierCertificatesTotal}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Всего в реестре</div>
          <div className="stat-card__value">{registryCertificatesTotal}</div>
        </div>
      </div>

      <p className="section-subtitle">
        Счетчик поставщиков показывает только сертификаты, привязанные к
        аккаунтам с ролью поставщика. Общий реестр включает все сертификаты в
        базе.
      </p>

      {message && <div className="success-panel">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="card">
        <form className="list-filters" onSubmit={handleSubmit}>
          <input
            className="search-input"
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
            placeholder="Название, email, ИНН или номер партии"
          />
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as AdminSupplierStatus | "",
              }))
            }
          >
            <option value="">Все статусы</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
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
          <div className="actions-row list-filters__actions">
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
                <th>Поставщик</th>
                <th>Статус</th>
                <th>2FA</th>
                <th>Активность</th>
                <th>Последняя партия</th>
                <th>Управление</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <div className="table-main">
                      {supplier.companyName ?? supplier.name}
                    </div>
                    <div className="table-sub">{supplier.email}</div>
                    <div className="table-sub">ИНН: {supplier.inn ?? "-"}</div>
                  </td>
                  <td>
                    <span className={getStatusClass(supplier.status)}>
                      {statusLabels[supplier.status]}
                    </span>
                  </td>
                  <td>{supplier.twoFactorEnabled ? "Email-код" : "Отключена"}</td>
                  <td>
                    <div className="table-main">
                      Партий: {supplier.batchesTotal}
                    </div>
                    <div className="table-sub">
                      Сертификатов: {supplier.certificatesTotal}
                    </div>
                    <div className="table-sub">
                      Создан: {formatDate(supplier.createdAt)}
                    </div>
                  </td>
                  <td>
                    {supplier.recentBatch ? (
                      <>
                        <div className="table-main">
                          {supplier.recentBatch.batchNumber}
                        </div>
                        <div className="table-sub">
                          {supplier.recentBatch.productName}
                        </div>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <select
                      value={supplier.status}
                      onChange={(event) =>
                        void handleStatusChange(
                          supplier,
                          event.target.value as AdminSupplierStatus
                        )
                      }
                      disabled={processingId === supplier.id}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}

              {!isLoading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={6}>Поставщики не найдены.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-log-pagination">
          <span>
            Найдено поставщиков: {pagination.total}. Страница {pagination.page}{" "}
            из {Math.max(pagination.totalPages, 1)}.
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
