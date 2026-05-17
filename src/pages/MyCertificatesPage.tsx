import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/AuthContext";
import StatusBadge from "../components/ui/StatusBadge";
import { getCertificatesRequest } from "../services/api";
import type { Certificate } from "../types/certificate";
import { formatFileSize, getCertificateStats, shortenHash } from "../utils/certificates";

export default function MyCertificatesPage() {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => getCertificateStats(certificates), [certificates]);

  const loadCertificates = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      setCertificates(await getCertificatesRequest(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить сертификаты"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCertificates();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadCertificates]);

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">Мои сертификаты</h1>
          <p className="section-subtitle">
            Сертификаты, которые были добавлены поставщиком в личном кабинете.
          </p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => void loadCertificates()}
          disabled={isLoading}
        >
          {isLoading ? "Обновление..." : "Обновить"}
        </button>
      </div>

      <div className="stats">
        <div className="card stat-card">
          <div className="stat-card__label">Всего</div>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Подтверждены</div>
          <div className="stat-card__value">{stats.confirmed}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">На проверке</div>
          <div className="stat-card__value">{stats.checking}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Есть вопросы</div>
          <div className="stat-card__value">{stats.issues}</div>
        </div>
      </div>

      {isLoading && <div className="empty-state">Загрузка сертификатов...</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="card">
        <div className="details-grid registry-grid">
          {certificates.map((certificate) => (
            <article key={certificate.id} className="detail-card registry-card">
              <div className="verify-result__header">
                <div>
                  <div className="detail-card__label">Сертификат</div>
                  <div className="detail-card__value">{certificate.id}</div>
                  <div className="table-sub">{certificate.batchNumber}</div>
                </div>
                <StatusBadge status={certificate.status} />
              </div>

              <div className="registry-card__body">
                <div>
                  <span>Продукция</span>
                  <strong>{certificate.product}</strong>
                </div>
                <div>
                  <span>Происхождение</span>
                  <strong>{certificate.originRegion}</strong>
                </div>
                <div>
                  <span>Дата производства</span>
                  <strong>{certificate.productionDate}</strong>
                </div>
                <div>
                  <span>Дата выдачи</span>
                  <strong>{certificate.issueDate}</strong>
                </div>
                <div>
                  <span>Документ</span>
                  <strong>{certificate.documentNumber}</strong>
                </div>
                <div>
                  <span>Файл</span>
                  <strong>
                    {certificate.fileName ?? "не указан"} · {formatFileSize(certificate.fileSize)}
                  </strong>
                </div>
                <div>
                  <span>SHA-256</span>
                  <strong>{shortenHash(certificate.hash, 16, 10)}</strong>
                </div>
                <div>
                  <span>Транзакция</span>
                  <strong>{shortenHash(certificate.blockchain, 14, 8)}</strong>
                </div>
              </div>

              {certificate.publicUrl && (
                <div className="registry-card__footer">
                  {certificate.qrCodeDataUrl && (
                    <img
                      src={certificate.qrCodeDataUrl}
                      alt={`QR-код для ${certificate.id}`}
                    />
                  )}
                  <a className="public-link" href={certificate.publicUrl}>
                    Открыть публичную проверку
                  </a>
                </div>
              )}
            </article>
          ))}

          {!isLoading && certificates.length === 0 && (
            <div className="empty-state">
              У поставщика пока нет добавленных сертификатов.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
