import { useNavigate } from "react-router-dom";
import heroImage from "../assets/baran.jpg";
import { useCertificates } from "../app/CertificatesContext";
import { getCertificateStats } from "../utils/certificates";

export default function HomePage() {
  const navigate = useNavigate();
  const { certificates } = useCertificates();
  const stats = getCertificateStats(certificates);

  return (
    <section className="page">
      <div className="hero">
        <div className="hero__content">
          <div className="hero__badge">MVP дипломного проекта</div>
          <h1 className="hero__title">
            VerMeat — цифровая проверка происхождения боргойской баранины
          </h1>
          <p className="hero__text">
            Поставщик загружает сертификат партии, система формирует SHA-256,
            сохраняет контрольные данные и открывает публичную проверку для
            покупателя по номеру партии или QR-токену.
          </p>

          <div className="hero__actions">
            <button
              className="button button--primary"
              onClick={() => navigate("/supplier")}
            >
              Добавить сертификат
            </button>
            <button
              className="button button--secondary"
              onClick={() => navigate("/verify")}
            >
              Проверить продукцию
            </button>
          </div>
        </div>

        <div className="hero__panel hero__image-panel">
          <img
            src={heroImage}
            alt="Боргойская баранина"
            className="hero__image"
          />
        </div>
      </div>

      <div className="stats">
        <div className="card stat-card">
          <div className="stat-card__label">Всего сертификатов</div>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Подтверждено</div>
          <div className="stat-card__value">{stats.confirmed}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">На проверке</div>
          <div className="stat-card__value">{stats.checking}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">С расхождениями</div>
          <div className="stat-card__value">{stats.issues}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Что закрывает текущий прототип</h2>
        <ul className="feature-list">
          <li>роли поставщика, администратора и публичного покупателя</li>
          <li>карточку партии с происхождением, массой и датой производства</li>
          <li>загрузку сертификата и расчет SHA-256 в браузере</li>
          <li>локальный реестр сертификатов с CID и transaction hash-заглушками</li>
          <li>публичную проверку по номеру сертификата, партии или QR-токену</li>
        </ul>
      </div>
    </section>
  );
}
