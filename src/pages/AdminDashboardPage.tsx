import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import CertificateEvidence from "../components/certificates/CertificateEvidence";
import StatusBadge from "../components/ui/StatusBadge";
import {
  getAdminDashboardRequest,
  type AdminDashboard,
} from "../services/api";
import type { Certificate } from "../types/certificate";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function CertificateList({
  title,
  emptyText,
  certificates,
}: {
  title: string;
  emptyText: string;
  certificates: Certificate[];
}) {
  return (
    <div className="card">
      <div className="section-header section-header--start">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-subtitle">Последние записи, требующие внимания.</p>
        </div>
      </div>

      <div className="dashboard-list">
        {certificates.map((certificate) => (
          <article className="dashboard-list__item" key={certificate.id}>
            <div className="dashboard-list__header">
              <div>
                <div className="table-main">{certificate.id}</div>
                <div className="table-sub">
                  {certificate.product} / {certificate.batchNumber}
                </div>
              </div>
              <StatusBadge status={certificate.status} />
            </div>
            <CertificateEvidence certificate={certificate} showPublicLink />
          </article>
        ))}

        {certificates.length === 0 && <div className="empty-state">{emptyText}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      setDashboard(await getAdminDashboardRequest(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить dashboard администратора"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">Dashboard администратора</h1>
          <p className="section-subtitle">
            Быстрый обзор поставщиков, сертификатов на проверке, проблемных
            записей и публичных проверок.
          </p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => void loadDashboard()}
          disabled={isLoading}
        >
          {isLoading ? "Обновление..." : "Обновить"}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {dashboard && (
        <>
          <div className="stats admin-summary-grid">
            <div className="card stat-card">
              <div className="stat-card__label">Поставщики</div>
              <div className="stat-card__value">
                {dashboard.overview.suppliersTotal}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Сертификаты</div>
              <div className="stat-card__value">
                {dashboard.overview.certificatesTotal}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">На проверке</div>
              <div className="stat-card__value">
                {dashboard.overview.certificatesPending}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Проблемные</div>
              <div className="stat-card__value">
                {dashboard.overview.certificatesWithProblems}
              </div>
            </div>
          </div>

          <div className="card quick-actions">
            <button
              className="button button--primary"
              onClick={() => navigate("/registry")}
            >
              Реестр сертификатов
            </button>
            <button
              className="button button--secondary"
              onClick={() => navigate("/admin/suppliers")}
            >
              Поставщики
            </button>
            <button
              className="button button--secondary"
              onClick={() => navigate("/admin/status")}
            >
              Состояние системы
            </button>
            <button
              className="button button--secondary"
              onClick={() => navigate("/admin/logs")}
            >
              Журнал аудита
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="section-header section-header--start">
                <div>
                  <h2 className="section-title">Последние поставщики</h2>
                  <p className="section-subtitle">
                    Новые учетные записи и их активность в системе.
                  </p>
                </div>
              </div>

              <div className="dashboard-list">
                {dashboard.recentSuppliers.map((supplier) => (
                  <article className="dashboard-list__item" key={supplier.id}>
                    <div className="dashboard-list__header">
                      <div>
                        <div className="table-main">
                          {supplier.companyName ?? supplier.name}
                        </div>
                        <div className="table-sub">{supplier.email}</div>
                      </div>
                      <span className="status-badge status-badge--success">
                        {supplier.status}
                      </span>
                    </div>
                    <div className="dashboard-metrics">
                      <span>Партии: {supplier.batchesTotal}</span>
                      <span>Сертификаты: {supplier.certificatesTotal}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-header section-header--start">
                <div>
                  <h2 className="section-title">Неуспешные проверки</h2>
                  <p className="section-subtitle">
                    Запросы, по которым публичная проверка вернула ошибку.
                  </p>
                </div>
              </div>

              <div className="dashboard-list">
                {dashboard.failedVerifications.map((verification) => (
                  <article
                    className="dashboard-list__item"
                    key={verification.id}
                  >
                    <div className="table-main">{verification.query}</div>
                    <div className="table-sub">
                      {formatDateTime(verification.createdAt)}
                    </div>
                    <div className="dashboard-message">
                      {verification.message}
                    </div>
                  </article>
                ))}

                {dashboard.failedVerifications.length === 0 && (
                  <div className="empty-state">Неуспешных проверок нет.</div>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <CertificateList
              title="Сертификаты на проверке"
              emptyText="Нет сертификатов на проверке."
              certificates={dashboard.pendingCertificates}
            />
            <CertificateList
              title="Проблемные сертификаты"
              emptyText="Проблемных сертификатов нет."
              certificates={dashboard.problemCertificates}
            />
          </div>
        </>
      )}

      {!dashboard && !isLoading && !error && (
        <div className="empty-state">Dashboard еще не загружен.</div>
      )}
    </section>
  );
}
