import { useState } from "react";
import StatusBadge from "../components/ui/StatusBadge";
import { useCertificates } from "../app/CertificatesContext";

export default function VerifyPage() {
  const { certificates } = useCertificates();
  const [query, setQuery] = useState("CERT-2026-001");

  const found = certificates.find(
    (item) =>
      item.id.toLowerCase() === query.toLowerCase() ||
      item.product.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="page verify-grid">
      <div className="card">
        <h2 className="section-title">Проверка подлинности</h2>

        <div className="form-group">
          <label>Номер сертификата или партия</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите номер сертификата"
          />
        </div>

        <div className="actions-row">
          <button className="button button--primary">Проверить</button>
          <button className="button button--secondary">Сканировать QR</button>
        </div>

        <div className="upload-box">
          <div className="upload-box__title">Публичная проверка</div>
          <div className="upload-box__text">
            Позже здесь будет работать проверка по QR-коду и номеру записи в блокчейне
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Результат проверки</h2>

        {found ? (
          <div className="verify-result">
            <div className="verify-result__header">
              <div>
                <div className="verify-result__title">Запись найдена в реестре</div>
                <div className="verify-result__subtitle">
                  Данные сертификата доступны для проверки
                </div>
              </div>
              <StatusBadge status={found.status} />
            </div>

            <div className="details-grid">
              <div className="detail-card">
                <div className="detail-card__label">Номер сертификата</div>
                <div className="detail-card__value">{found.id}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Поставщик</div>
                <div className="detail-card__value">{found.supplier}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Партия</div>
                <div className="detail-card__value">{found.product}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Орган сертификации</div>
                <div className="detail-card__value">{found.authority}</div>
              </div>
            </div>

            <div className="blockchain-box">
              <div className="blockchain-box__title">Контрольные данные</div>
              <div className="blockchain-box__row">
                <span>Хеш документа</span>
                <strong>{found.hash}</strong>
              </div>
              <div className="blockchain-box__row">
                <span>Транзакция</span>
                <strong>{found.blockchain}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            Запись не найдена. Попробуй ввести <strong>CERT-2026-001</strong>
          </div>
        )}
      </div>
    </section>
  );
}