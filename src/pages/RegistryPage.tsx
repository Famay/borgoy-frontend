import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/AuthContext";
import { useCertificates } from "../app/CertificatesContext";
import StatusBadge from "../components/ui/StatusBadge";
import {
  deleteCertificateRequest,
  getCertificatesRequest,
  updateCertificateStatusRequest,
} from "../services/api";
import type { Certificate, CertificateStatus } from "../types/certificate";
import { shortenHash } from "../utils/certificates";

const statusOptions: CertificateStatus[] = [
  "На проверке",
  "Подтвержден",
  "Есть расхождения",
  "Ошибка blockchain",
];

export default function RegistryPage() {
  const { token } = useAuth();
  const { certificates: localCertificates } = useCertificates();
  const [apiCertificates, setApiCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCertificates = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      setApiCertificates(await getCertificatesRequest(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить реестр из API"
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

  const certificates = useMemo(() => {
    if (apiCertificates.length > 0) {
      return apiCertificates;
    }

    return localCertificates;
  }, [apiCertificates, localCertificates]);

  const handleStatusChange = async (
    certificate: Certificate,
    nextStatus: CertificateStatus
  ) => {
    if (!token || certificate.status === nextStatus) {
      return;
    }

    setProcessingId(certificate.id);
    setError("");
    setMessage("");

    try {
      const updatedCertificate = await updateCertificateStatusRequest(
        certificate.id,
        nextStatus,
        token
      );

      setApiCertificates((current) =>
        current.map((item) =>
          item.id === certificate.id ? updatedCertificate : item
        )
      );
      setMessage(`Статус сертификата ${certificate.id} изменен.`);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось изменить статус сертификата"
      );
    } finally {
      setProcessingId("");
    }
  };

  const handleDelete = async (certificate: Certificate) => {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить сертификат ${certificate.id}? Это действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(certificate.id);
    setError("");
    setMessage("");

    try {
      await deleteCertificateRequest(certificate.id, token);
      setApiCertificates((current) =>
        current.filter((item) => item.id !== certificate.id)
      );
      setMessage(`Сертификат ${certificate.id} удален.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Не удалось удалить сертификат"
      );
    } finally {
      setProcessingId("");
    }
  };

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">Реестр сертификатов</h1>
          <p className="section-subtitle">
            Администратор может менять статус сертификата и удалять ошибочные
            записи из PostgreSQL.
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

      {isLoading && <div className="empty-state">Загрузка реестра...</div>}
      {message && <div className="success-panel">{message}</div>}
      {error && (
        <div className="form-error">
          {error}. Если API недоступен, показан локальный fallback из текущей
          сессии.
        </div>
      )}

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

              <div className="registry-admin-actions">
                <label>
                  <span>Статус</span>
                  <select
                    value={certificate.status}
                    onChange={(event) =>
                      void handleStatusChange(
                        certificate,
                        event.target.value as CertificateStatus
                      )
                    }
                    disabled={processingId === certificate.id || !token}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="button button--danger"
                  onClick={() => void handleDelete(certificate)}
                  disabled={processingId === certificate.id || !token}
                >
                  {processingId === certificate.id ? "Обработка..." : "Удалить"}
                </button>
              </div>

              <div className="registry-card__body">
                <div>
                  <span>Поставщик</span>
                  <strong>{certificate.supplier}</strong>
                </div>
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
                  <span>Документ</span>
                  <strong>{certificate.documentNumber}</strong>
                </div>
                <div>
                  <span>IPFS CID</span>
                  <strong>{certificate.ipfsCid ?? "не загружен"}</strong>
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
            <div className="empty-state">В реестре пока нет сертификатов.</div>
          )}
        </div>
      </div>
    </section>
  );
}
