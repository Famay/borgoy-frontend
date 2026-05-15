import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import {
  getAdminOverviewRequest,
  type AdminOverview,
  type AuditLogEntry,
} from "../services/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  return role === "admin" ? "Администратор" : "Поставщик";
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) {
      return;
    }

    let isMounted = true;

    getAdminOverviewRequest(token)
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setOverview(result.overview);
        setRecentLogs(result.recentLogs);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить данные администратора"
        );
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, token]);

  if (!user) {
    return null;
  }

  return (
    <section className="page profile-grid">
      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {isAdmin ? "Профиль администратора" : "Профиль поставщика"}
            </h2>
            <p className="section-subtitle">
              Данные текущей учетной записи и рабочие действия в системе.
            </p>
          </div>
          {isAdmin && (
            <button
              className="button button--primary"
              onClick={() => navigate("/admin/logs")}
            >
              Журнал аудита
            </button>
          )}
        </div>

        <div className="details-grid">
          <div className="detail-card">
            <div className="detail-card__label">Имя</div>
            <div className="detail-card__value">{user.name}</div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Роль</div>
            <div className="detail-card__value">{roleLabel(user.role)}</div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Email</div>
            <div className="detail-card__value">{user.email}</div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Организация</div>
            <div className="detail-card__value">
              {user.companyName ?? "Не указана"}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Статус аккаунта</div>
            <div className="detail-card__value">{user.status ?? "ACTIVE"}</div>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="stats admin-stats">
            <div className="card stat-card">
              <div className="stat-card__label">Поставщики</div>
              <div className="stat-card__value">
                {overview?.suppliersTotal ?? "-"}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Партии</div>
              <div className="stat-card__value">
                {overview?.batchesTotal ?? "-"}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Сертификаты</div>
              <div className="stat-card__value">
                {overview?.certificatesTotal ?? "-"}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Проверки QR</div>
              <div className="stat-card__value">
                {overview?.verificationChecks ?? "-"}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <h2 className="section-title">Последние события</h2>
                <p className="section-subtitle">
                  Реальные записи из таблицы AuditLog.
                </p>
              </div>
              <button
                className="button button--secondary"
                onClick={() => navigate("/admin/logs")}
              >
                Все логи
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="audit-feed">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <article className="audit-item" key={log.id}>
                    <div>
                      <div className="audit-item__title">{log.actionLabel}</div>
                      <div className="audit-item__message">{log.message}</div>
                    </div>
                    <div className="audit-item__meta">
                      <span>{formatDateTime(log.createdAt)}</span>
                      <span>{log.user?.email ?? "system"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">Событий пока нет.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <h2 className="section-title">Рабочие действия</h2>
          <ul className="feature-list">
            <li>создать партию продукции и загрузить сертификат</li>
            <li>сформировать серверный SHA-256 файла</li>
            <li>получить QR-код публичной проверки</li>
            <li>проверить статус сертификата в реестре после обработки</li>
          </ul>
        </div>
      )}
    </section>
  );
}
