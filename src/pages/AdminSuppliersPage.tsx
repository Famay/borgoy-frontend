import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/AuthContext";
import {
  getAdminSuppliersRequest,
  getAdminSystemStatusRequest,
  updateSupplierStatusRequest,
  type AdminSupplier,
  type AdminSupplierStatus,
} from "../services/api";

const statusOptions: AdminSupplierStatus[] = ["ACTIVE", "PENDING", "BLOCKED"];

const statusLabels: Record<AdminSupplierStatus, string> = {
  ACTIVE: "Активен",
  PENDING: "Ожидает",
  BLOCKED: "Заблокирован",
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
  const [query, setQuery] = useState("");
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
      const [nextSuppliers, systemStatus] = await Promise.all([
        getAdminSuppliersRequest(token),
        getAdminSystemStatusRequest(token),
      ]);

      setSuppliers(nextSuppliers);
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
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSuppliers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      const searchText = [
        supplier.name,
        supplier.companyName,
        supplier.email,
        supplier.inn,
        supplier.recentBatch?.batchNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }, [query, suppliers]);

  const totals = useMemo(
    () => ({
      active: suppliers.filter((supplier) => supplier.status === "ACTIVE").length,
      blocked: suppliers.filter((supplier) => supplier.status === "BLOCKED")
        .length,
      supplierCertificates: suppliers.reduce(
        (total, supplier) => total + supplier.certificatesTotal,
        0
      ),
    }),
    [suppliers]
  );

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
      const updatedSupplier = await updateSupplierStatusRequest(
        supplier.id,
        status,
        token
      );

      setSuppliers((current) =>
        current.map((item) =>
          item.id === supplier.id ? updatedSupplier : item
        )
      );
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
          <div className="stat-card__value">{suppliers.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Активные</div>
          <div className="stat-card__value">{totals.active}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Заблокированные</div>
          <div className="stat-card__value">{totals.blocked}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Сертификаты</div>
          <div className="stat-card__value">{totals.supplierCertificates}</div>
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
        <div className="admin-toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию, email, ИНН или партии"
          />
        </div>

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
              {filteredSuppliers.map((supplier) => (
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

              {!isLoading && filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6}>Поставщики не найдены.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
