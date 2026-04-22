import { useState } from "react";
import { useCertificates } from "../app/CertificatesContext";
import type { SupplierForm } from "../types/certificate";

export default function SupplierPage() {
  const { certificates, addCertificate } = useCertificates();

  const [form, setForm] = useState<SupplierForm>({
    supplier: "ООО «Боргойский продукт»",
    product: "Боргойская баранина, партия №244",
    authority: "Лаборатория ветеринарного контроля",
    description: "Сертификат качества и происхождения продукции",
  });

  const handleSubmit = () => {
    const nextId = `CERT-2026-${String(certificates.length + 1).padStart(3, "0")}`;

    addCertificate({
      id: nextId,
      supplier: form.supplier,
      product: form.product,
      issueDate: "2026-04-22",
      status: "На проверке",
      blockchain: "0xDEMO...1234",
      hash: "demo_hash_001",
      authority: form.authority,
      description: form.description,
    });
  };

  return (
    <section className="page page-grid">
      <div className="card">
        <div className="section-header section-header--start">
          <div>
            <h2 className="section-title">Загрузка нового сертификата</h2>
            <p className="section-subtitle">
              Форма демонстрирует будущий сценарий добавления сертификата поставщиком
            </p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Поставщик</label>
            <input
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Сертифицирующий орган</label>
            <input
              value={form.authority}
              onChange={(e) => setForm({ ...form, authority: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Продукция / партия</label>
          <input
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Описание документа</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="upload-box">
          <div className="upload-box__title">Загрузка файла сертификата</div>
          <div className="upload-box__text">
            На следующем этапе сюда можно добавить загрузку PDF или изображения
          </div>
        </div>

        <div className="actions-row">
          <button className="button button--primary" onClick={handleSubmit}>
            Сохранить и отправить на проверку
          </button>
          <button className="button button--secondary">Сформировать хеш</button>
        </div>
      </div>

      <div className="side-column">
        <div className="card">
          <h2 className="section-title">Логика обработки</h2>
          <ol className="logic-list">
            <li>Поставщик загружает сертификат</li>
            <li>Система формирует контрольный хеш документа</li>
            <li>Хеш фиксируется в блокчейне</li>
            <li>Метаданные сохраняются в базе данных</li>
            <li>Администратор подтверждает запись</li>
            <li>Пользователь проверяет подлинность сертификата</li>
          </ol>
        </div>

        <div className="card">
          <h2 className="section-title">Что будет дальше</h2>
          <ul className="feature-list">
            <li>загрузка реального PDF-файла сертификата</li>
            <li>генерация SHA-256 на сервере</li>
            <li>фиксация записи в тестовой блокчейн-сети</li>
            <li>создание QR-кода для публичной проверки</li>
          </ul>
        </div>
      </div>
    </section>
  );
}