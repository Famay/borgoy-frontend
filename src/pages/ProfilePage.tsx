export default function ProfilePage() {
  return (
    <section className="page profile-grid">
      <div className="card">
        <h2 className="section-title">Профиль пользователя</h2>

        <div className="details-grid">
          <div className="detail-card">
            <div className="detail-card__label">ФИО</div>
            <div className="detail-card__value">Андрей Иванов</div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Роль</div>
            <div className="detail-card__value">Поставщик</div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Организация</div>
            <div className="detail-card__value">ООО «Боргойский продукт»</div>
          </div>

          <div className="detail-card">
            <div className="detail-card__label">Статус аккаунта</div>
            <div className="detail-card__value">Активен</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">План развития аккаунта</h2>
        <ul className="feature-list">
          <li>добавление истории действий</li>
          <li>просмотр всех отправленных сертификатов</li>
          <li>управление реквизитами поставщика</li>
          <li>уведомления о статусе проверки</li>
          <li>скачивание подтвержденных записей</li>
        </ul>
      </div>
    </section>
  );
}