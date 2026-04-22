import StatusBadge from "../components/ui/StatusBadge";
import { useCertificates } from "../app/CertificatesContext";

export default function RegistryPage() {
  const { certificates } = useCertificates();

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <h1 className="section-title">Реестр сертификатов</h1>
          <p className="section-subtitle">
            Список сертификатов с текущим статусом, поставщиком и данными
            верификации
          </p>
        </div>
      </div>

      <div className="card">
        <div className="details-grid">
          {certificates.map((certificate) => (
            <article key={certificate.id} className="detail-card">
              <div className="verify-result__header">
                <div>
                  <div className="detail-card__label">Номер сертификата</div>
                  <div className="detail-card__value">{certificate.id}</div>
                </div>
                <StatusBadge status={certificate.status} />
              </div>

              <div className="blockchain-box">
                <div className="blockchain-box__row">
                  <span>Поставщик</span>
                  <strong>{certificate.supplier}</strong>
                </div>
                <div className="blockchain-box__row">
                  <span>Продукция</span>
                  <strong>{certificate.product}</strong>
                </div>
                <div className="blockchain-box__row">
                  <span>Дата выдачи</span>
                  <strong>{certificate.issueDate}</strong>
                </div>
                <div className="blockchain-box__row">
                  <span>Орган сертификации</span>
                  <strong>{certificate.authority}</strong>
                </div>
                <div className="blockchain-box__row">
                  <span>Хеш</span>
                  <strong>{certificate.hash}</strong>
                </div>
                <div className="blockchain-box__row">
                  <span>Транзакция</span>
                  <strong>{certificate.blockchain}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
