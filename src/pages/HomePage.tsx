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
          <div className="hero__badge">Прототип дипломного проекта</div>
          <h1 className="hero__title">
            VerMeat - система цифровой верификации мясной продукции
          </h1>
          <p className="hero__text">
            VerMeat - веб-платформа для хранения сертификатов, фиксации их хеша в
            блокчейне и проверки подлинности продукции по номеру партии или документа.
          </p>

          <div className="hero__actions">
            <button className="button button--primary" onClick={() => navigate("/supplier")}>
              Начать работу
            </button>
            <button className="button button--secondary" onClick={() => navigate("/verify")}>
              Проверить сертификат
            </button>
          </div>
        </div>

        <div className="hero__panel hero__image-panel">
          <img src={heroImage} alt="Мясная продукция" className="hero__image" />
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
        <h2 className="section-title">Что уже показывает прототип</h2>
        <ul className="feature-list">
          <li>Личный кабинет поставщика</li>
          <li>Загрузку сертификатов и привязку к партии</li>
          <li>Реестр сертификатов</li>
          <li>Проверку подлинности по номеру сертификата</li>
          <li>Отображение хеша и идентификатора записи</li>
        </ul>
      </div>
    </section>
  );
}
