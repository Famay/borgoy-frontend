import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import CertificateEvidence from "../components/certificates/CertificateEvidence";
import CertificateHistory from "../components/certificates/CertificateHistory";
import PublicQr from "../components/ui/PublicQr";
import StatusBadge from "../components/ui/StatusBadge";
import {
  getBatchDetailsRequest,
  type BatchDetails,
} from "../services/api";
import { toAbsolutePublicUrl } from "../utils/qrCode";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BatchDetailsPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [details, setDetails] = useState<BatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDetails = useCallback(async () => {
    if (!token || !batchId) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      setDetails(await getBatchDetailsRequest(batchId, token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить данные партии"
      );
    } finally {
      setIsLoading(false);
    }
  }, [batchId, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDetails();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDetails]);

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            {details ? `Партия ${details.batchNumber}` : "Детали партии"}
          </h1>
          <p className="section-subtitle">
            Данные партии, сертификаты, QR-код и история проверок.
          </p>
        </div>
        <div className="actions-row">
          <button
            className="button button--secondary"
            onClick={() => navigate("/batches")}
          >
            К списку партий
          </button>
          <button
            className="button button--secondary"
            onClick={() => void loadDetails()}
            disabled={isLoading}
          >
            {isLoading ? "Обновление..." : "Обновить"}
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {isLoading && !details && (
        <div className="empty-state">Загрузка данных партии...</div>
      )}

      {details && (
        <>
          <div className="stats">
            <div className="card stat-card">
              <div className="stat-card__label">Сертификаты</div>
              <div className="stat-card__value">
                {details.certificates.length}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Публичные проверки</div>
              <div className="stat-card__value">
                {details.verificationSummary.total}
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-card__label">Неуспешные проверки</div>
              <div className="stat-card__value">
                {details.verificationSummary.failed}
              </div>
            </div>
          </div>

          <div className="batch-details-grid">
            <div className="card">
              <div className="section-header section-header--start">
                <div>
                  <h2 className="section-title">Основные сведения</h2>
                  <p className="section-subtitle">
                    Создана {formatDateTime(details.createdAt)}
                  </p>
                </div>
              </div>

              <div className="details-grid">
                <div className="detail-card">
                  <div className="detail-card__label">Номер партии</div>
                  <div className="detail-card__value">
                    {details.batchNumber}
                  </div>
                </div>
                <div className="detail-card">
                  <div className="detail-card__label">Продукция</div>
                  <div className="detail-card__value">
                    {details.productName}
                  </div>
                </div>
                <div className="detail-card">
                  <div className="detail-card__label">Происхождение</div>
                  <div className="detail-card__value">
                    {details.originRegion}
                  </div>
                </div>
                <div className="detail-card">
                  <div className="detail-card__label">Дата производства</div>
                  <div className="detail-card__value">
                    {details.productionDate}
                  </div>
                </div>
                <div className="detail-card">
                  <div className="detail-card__label">Вес</div>
                  <div className="detail-card__value">
                    {details.weightKg} кг
                  </div>
                </div>
                {user?.role === "admin" && (
                  <div className="detail-card">
                    <div className="detail-card__label">Поставщик</div>
                    <div className="detail-card__value">
                      {details.supplier?.companyName ??
                        details.supplier?.name ??
                        "-"}
                    </div>
                    <div className="table-sub">
                      {details.supplier?.email ?? "-"}
                    </div>
                  </div>
                )}
                {details.description && (
                  <div className="detail-card">
                    <div className="detail-card__label">Описание</div>
                    <div className="detail-card__value">
                      {details.description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card batch-public-card">
              <div>
                <h2 className="section-title">Публичная проверка</h2>
                <p className="section-subtitle">
                  QR-код ведет на проверку сертификата партии.
                </p>
              </div>
              <PublicQr
                value={toAbsolutePublicUrl(details.publicUrl)}
                fileName={`vermeat-batch-${details.batchNumber}.png`}
                alt={`QR-код партии ${details.batchNumber}`}
              />
              <a className="public-link" href={details.publicUrl}>
                Открыть публичную проверку
              </a>
            </div>
          </div>

          <div className="card">
            <div className="section-header section-header--start">
              <div>
                <h2 className="section-title">Сертификаты</h2>
                <p className="section-subtitle">
                  Документы, связанные с этой партией.
                </p>
              </div>
            </div>

            <div className="details-grid registry-grid">
              {details.certificates.map((certificate) => (
                <article
                  key={certificate.id}
                  className="detail-card registry-card"
                >
                  <div className="verify-result__header">
                    <div>
                      <div className="detail-card__label">Сертификат</div>
                      <div className="detail-card__value">{certificate.id}</div>
                    </div>
                    <StatusBadge status={certificate.status} />
                  </div>

                  <div className="registry-card__body">
                    <div>
                      <span>Документ</span>
                      <strong>{certificate.documentNumber}</strong>
                    </div>
                    <div>
                      <span>Орган выдачи</span>
                      <strong>{certificate.authority}</strong>
                    </div>
                    <div>
                      <span>Дата выдачи</span>
                      <strong>{certificate.issueDate}</strong>
                    </div>
                    {certificate.cancellationReason && (
                      <div>
                        <span>Причина аннулирования</span>
                        <strong>{certificate.cancellationReason}</strong>
                      </div>
                    )}
                  </div>

                  <CertificateEvidence
                    certificate={certificate}
                    showPublicLink={false}
                  />
                  <CertificateHistory history={certificate.history} />
                </article>
              ))}

              {details.certificates.length === 0 && (
                <div className="empty-state">
                  У партии пока нет сертификатов.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-header section-header--start">
              <div>
                <h2 className="section-title">История публичных проверок</h2>
                <p className="section-subtitle">
                  Последние 50 попыток проверки сертификатов партии.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Результат</th>
                    <th>Сертификат</th>
                    <th>Запрос</th>
                    <th>Сообщение</th>
                  </tr>
                </thead>
                <tbody>
                  {details.checks.map((check) => (
                    <tr key={check.id}>
                      <td>{formatDateTime(check.createdAt)}</td>
                      <td>
                        <span
                          className={
                            check.isValid
                              ? "status-badge status-badge--success"
                              : "status-badge status-badge--danger"
                          }
                        >
                          {check.isValid ? "Подтвержден" : "Не подтвержден"}
                        </span>
                      </td>
                      <td>{check.certificate?.certificateNo ?? "-"}</td>
                      <td className="mono-text">{check.query}</td>
                      <td>{check.message}</td>
                    </tr>
                  ))}

                  {details.checks.length === 0 && (
                    <tr>
                      <td colSpan={5}>Публичных проверок пока нет.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="section-header section-header--start">
              <div>
                <h2 className="section-title">История изменений</h2>
                <p className="section-subtitle">
                  События партии и связанных сертификатов.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Событие</th>
                    <th>Пользователь</th>
                    <th>Сообщение</th>
                  </tr>
                </thead>
                <tbody>
                  {details.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.createdAt)}</td>
                      <td>{log.actionLabel}</td>
                      <td>{log.user?.email ?? "Система"}</td>
                      <td>{log.message}</td>
                    </tr>
                  ))}

                  {details.auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4}>Событий пока нет.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
