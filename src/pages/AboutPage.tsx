export default function AboutPage() {
  return (
    <section className="page">
      <div className="card about-hero">
        <div>
          <div className="about-hero__eyebrow">Дипломный проект</div>
          <h1 className="about-hero__title">VerMeat</h1>
          <p className="about-hero__text">
            VerMeat - информационная система для цифровой проверки
            происхождения мясной продукции, сертификатов и партий поставки.
            Проект показывает, как можно связать кабинет поставщика, публичную
            QR-проверку, IPFS и blockchain-запись в одном рабочем процессе.
          </p>
        </div>
        <div className="about-hero__meta">
          <div>
            <span>Создатель</span>
            <strong>Воронин Андрей</strong>
          </div>
          <div>
            <span>Назначение</span>
            <strong>Дипломная демонстрационная система</strong>
          </div>
          <div>
            <span>Домен</span>
            <strong>vermeat.ru</strong>
          </div>
        </div>
      </div>

      <div className="about-grid">
        <div className="card">
          <h2 className="section-title">Что делает сайт</h2>
          <div className="about-list">
            <div>
              <strong>Поставщик</strong>
              <p>
                Создает партии продукции, загружает сертификаты, получает QR-код
                и публичную ссылку для проверки.
              </p>
            </div>
            <div>
              <strong>Покупатель</strong>
              <p>
                Проверяет сертификат без регистрации по QR-коду, номеру партии
                или номеру сертификата.
              </p>
            </div>
            <div>
              <strong>Администратор</strong>
              <p>
                Управляет поставщиками, смотрит реестр сертификатов, статусы,
                audit log и состояние интеграций.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Что проверяется</h2>
          <div className="about-list">
            <div>
              <strong>SHA-256</strong>
              <p>
                Для файла сертификата считается контрольный hash, который
                помогает обнаружить подмену документа.
              </p>
            </div>
            <div>
              <strong>IPFS</strong>
              <p>
                Данные сертификата могут быть связаны с IPFS CID через Pinata,
                чтобы показать независимую ссылку на цифровой артефакт.
              </p>
            </div>
            <div>
              <strong>Polygon Amoy</strong>
              <p>
                Hash сертификата может фиксироваться в smart contract в тестовой
                сети Polygon Amoy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Технологический стек</h2>
        <div className="tech-grid">
          <div>
            <span>Frontend</span>
            <strong>React, TypeScript, Vite, React Router</strong>
          </div>
          <div>
            <span>Backend</span>
            <strong>Node.js, Express, Prisma, PostgreSQL</strong>
          </div>
          <div>
            <span>Безопасность</span>
            <strong>JWT, bcrypt, email 2FA для поставщиков</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>Maileroo SMTP</strong>
          </div>
          <div>
            <span>Хранилище</span>
            <strong>Pinata / IPFS</strong>
          </div>
          <div>
            <span>Blockchain</span>
            <strong>Solidity, Hardhat, Ethers.js, Polygon Amoy</strong>
          </div>
          <div>
            <span>Деплой</span>
            <strong>Docker Compose, Nginx, Certbot, Let&apos;s Encrypt</strong>
          </div>
          <div>
            <span>Проверка</span>
            <strong>QR-коды, публичный verify endpoint, audit log</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Как устроен сценарий</h2>
        <ol className="logic-list process-list">
          <li>
            <span>1</span>
            Поставщик входит в личный кабинет с email-кодом подтверждения.
          </li>
          <li>
            <span>2</span>
            Создает партию продукции и загружает файл сертификата.
          </li>
          <li>
            <span>3</span>
            Система сохраняет данные, считает SHA-256, формирует QR и публичную
            ссылку.
          </li>
          <li>
            <span>4</span>
            При настроенных интеграциях сертификат связывается с IPFS и Polygon
            Amoy.
          </li>
          <li>
            <span>5</span>
            Покупатель открывает QR-код и видит публичную карточку проверки.
          </li>
        </ol>
      </div>
    </section>
  );
}
