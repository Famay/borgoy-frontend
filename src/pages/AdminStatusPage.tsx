import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/AuthContext";
import {
  getAdminSystemStatusRequest,
  type AdminServiceStatus,
  type AdminSystemStatus,
} from "../services/api";

const serviceLabels: Record<keyof AdminSystemStatus["services"], string> = {
  database: "PostgreSQL",
  email: "Email 2FA",
  ipfs: "Pinata/IPFS",
  blockchain: "Polygon Amoy",
  app: "Приложение",
};

const statusLabels: Record<AdminServiceStatus, string> = {
  ok: "Работает",
  warning: "Проверить",
  error: "Ошибка",
};

function getStatusClass(status: AdminServiceStatus) {
  if (status === "ok") {
    return "status-badge status-badge--success";
  }

  if (status === "warning") {
    return "status-badge status-badge--warning";
  }

  return "status-badge status-badge--danger";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function AdminStatusPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      setStatus(await getAdminSystemStatusRequest(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить состояние системы"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadStatus]);

  const services = useMemo(() => {
    if (!status) {
      return [];
    }

    return Object.entries(status.services) as Array<
      [
        keyof AdminSystemStatus["services"],
        AdminSystemStatus["services"][keyof AdminSystemStatus["services"]],
      ]
    >;
  }, [status]);

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">Состояние системы</h1>
          <p className="section-subtitle">
            Быстрая проверка базы, отправки email-кодов, IPFS, blockchain и
            основных счетчиков проекта.
          </p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => void loadStatus()}
          disabled={isLoading}
        >
          {isLoading ? "Проверка..." : "Проверить"}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {status && (
        <>
          <div className="stats admin-summary-grid">
            <div className="card stat-card">
              <div className="stat-card__label">Пользователи</div>
              <div className="stat-card__value">{status.counts.usersTotal}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Поставщики</div>
              <div className="stat-card__value">
                {status.counts.suppliersTotal}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Партии</div>
              <div className="stat-card__value">{status.counts.batchesTotal}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Сертификаты</div>
              <div className="stat-card__value">
                {status.counts.certificatesTotal}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-header section-header--start">
              <div>
                <h2 className="section-title">Интеграции</h2>
                <p className="section-subtitle">
                  Последняя проверка: {formatDateTime(status.generatedAt)}
                </p>
              </div>
            </div>

            <div className="status-grid">
              {services.map(([key, service]) => (
                <article className="status-card" key={key}>
                  <div className="status-card__header">
                    <div className="status-card__title">
                      {serviceLabels[key]}
                    </div>
                    <span className={getStatusClass(service.status)}>
                      {statusLabels[service.status]}
                    </span>
                  </div>
                  <div className="status-card__details">{service.details}</div>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-header section-header--start">
              <div>
                <h2 className="section-title">Риски внимания</h2>
                <p className="section-subtitle">
                  Счетчики, которые помогают быстро понять, где нужны действия
                  администратора.
                </p>
              </div>
            </div>

            <div className="details-grid">
              <div className="detail-card">
                <div className="detail-card__label">
                  Сертификаты на проверке
                </div>
                <div className="detail-card__value">
                  {status.counts.pendingCertificates}
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-card__label">
                  Неуспешные публичные проверки
                </div>
                <div className="detail-card__value">
                  {status.counts.failedVerificationChecks}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!status && !isLoading && !error && (
        <div className="empty-state">Состояние системы еще не загружено.</div>
      )}
    </section>
  );
}
