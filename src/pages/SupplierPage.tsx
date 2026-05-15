import { useState } from "react";
import { useAuth } from "../app/AuthContext";
import { useCertificates } from "../app/CertificatesContext";
import type { Certificate, SupplierForm } from "../types/certificate";
import { formatFileSize, shortenHash } from "../utils/certificates";
import { calculateSha256 } from "../utils/fileHash";
import {
  checkCertificateFileRequest,
  createBatchRequest,
  uploadCertificateRequest,
} from "../services/api";

function createSequenceSuffix() {
  return Date.now().toString().slice(-6);
}

function createDefaultBatchNumber() {
  return `BORG-${new Date().getFullYear()}-${createSequenceSuffix()}`;
}

function createDefaultDocumentNumber() {
  return `VET-BRG-${new Date().getFullYear()}-${createSequenceSuffix()}`;
}

function createDefaultCertificateNo() {
  return `CERT-${new Date().getFullYear()}-${createSequenceSuffix()}`;
}

export default function SupplierPage() {
  const { addCertificate } = useCertificates();
  const { token, user } = useAuth();

  const [form, setForm] = useState<SupplierForm>({
    supplier: user?.companyName ?? "ООО «Боргойский продукт»",
    productName: "Боргойская баранина",
    batchNumber: createDefaultBatchNumber(),
    originRegion: "Боргойская степь, Джидинский район, Республика Бурятия",
    productionDate: "2026-04-22",
    weightKg: "240",
    authority: "Лаборатория ветеринарного контроля",
    documentNumber: createDefaultDocumentNumber(),
    description: "Сертификат качества и происхождения продукции",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastCertificate, setLastCertificate] = useState<Certificate | null>(
    null
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setFileHash("");
    setError("");
    setLastCertificate(null);
  };

  const generateHash = async () => {
    if (!selectedFile) {
      setError("Выберите PDF или изображение сертификата.");
      return "";
    }

    setError("");

    try {
      const hash = await calculateSha256(selectedFile);
      setFileHash(hash);
      return hash;
    } catch {
      setError("Не удалось сформировать SHA-256 для выбранного файла.");
      return "";
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      setError("Нужно войти в систему поставщика.");
      return;
    }

    if (!selectedFile) {
      setError("Выберите файл сертификата.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const previewHash = fileHash || (await generateHash());

      if (!previewHash) {
        setIsSubmitting(false);
        return;
      }

      const duplicateFile = await checkCertificateFileRequest(
        previewHash,
        token
      );

      if (duplicateFile.exists) {
        const duplicate = duplicateFile.certificate;

        setError(
          duplicate
            ? `Этот файл уже загружен как сертификат ${duplicate.certificateNo} для партии ${duplicate.batchNumber}. Загрузите другой файл.`
            : "Этот файл уже загружен. Загрузите другой файл."
        );
        return;
      }

      const certificateNo = createDefaultCertificateNo();

      const { batch } = await createBatchRequest(
        {
          batchNumber: form.batchNumber,
          productName: form.productName,
          originRegion: form.originRegion,
          productionDate: form.productionDate,
          weightKg: Number(form.weightKg.replace(",", ".")) || 0,
          description: form.description,
        },
        token
      );

      const certificate = await uploadCertificateRequest(
        {
          batchId: batch.id,
          certificateNo,
          file: selectedFile,
          documentNumber: form.documentNumber,
          authority: form.authority,
          description: form.description,
        },
        token
      );

      addCertificate(certificate);
      setFileHash(certificate.hash);
      setLastCertificate(certificate);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось сохранить сертификат"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page page-grid">
      <div className="card">
        <div className="section-header section-header--start">
          <div>
            <h2 className="section-title">Загрузка нового сертификата</h2>
            <p className="section-subtitle">
              Форма создает партию в PostgreSQL, отправляет файл на backend и получает серверный SHA-256, CID, транзакцию и QR-код.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="supplier">Поставщик</label>
            <input
              id="supplier"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="authority">Сертифицирующий орган</label>
            <input
              id="authority"
              value={form.authority}
              onChange={(e) => setForm({ ...form, authority: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="productName">Продукция</label>
            <input
              id="productName"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="batchNumber">Номер партии</label>
            <input
              id="batchNumber"
              value={form.batchNumber}
              onChange={(e) =>
                setForm({ ...form, batchNumber: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="originRegion">Регион происхождения</label>
            <input
              id="originRegion"
              value={form.originRegion}
              onChange={(e) =>
                setForm({ ...form, originRegion: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="productionDate">Дата производства</label>
            <input
              id="productionDate"
              type="date"
              value={form.productionDate}
              onChange={(e) =>
                setForm({ ...form, productionDate: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="weightKg">Масса партии, кг</label>
            <input
              id="weightKg"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="documentNumber">Номер документа</label>
            <input
              id="documentNumber"
              value={form.documentNumber}
              onChange={(e) =>
                setForm({ ...form, documentNumber: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание документа</label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="upload-box upload-box--interactive">
          <div className="upload-box__title">Файл сертификата</div>
          <div className="upload-box__text">
            Файл отправляется на backend через Multer. Сервер рассчитывает SHA-256 и сохраняет контрольные данные в PostgreSQL.
          </div>
          <input
            className="file-input"
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileChange}
          />

          <div className="file-meta">
            <span>{selectedFile?.name ?? "Файл не выбран"}</span>
            <span>{formatFileSize(selectedFile?.size)}</span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {fileHash && (
          <div className="hash-preview">
            <span>SHA-256</span>
            <strong>{fileHash}</strong>
          </div>
        )}

        {lastCertificate && (
          <div className="success-panel">
            <div className="qr-preview">
              {lastCertificate.qrCodeDataUrl && (
                <img
                  src={lastCertificate.qrCodeDataUrl}
                  alt={`QR-код для ${lastCertificate.id}`}
                />
              )}
              <div>
                <div>
                  <strong>{lastCertificate.id}</strong> сохранен в PostgreSQL.
                </div>
                <a href={lastCertificate.publicUrl}>
                  Публичная проверка: {lastCertificate.publicUrl}
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="actions-row">
          <button
            className="button button--secondary"
            onClick={generateHash}
            disabled={isSubmitting}
          >
            Сформировать SHA-256 локально
          </button>
          <button
            className="button button--primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Отправка..." : "Создать партию и сертификат"}
          </button>
        </div>
      </div>

      <div className="side-column">
        <div className="card">
          <h2 className="section-title">Пайплайн backend</h2>
          <ol className="logic-list process-list">
            <li>
              <span>1</span>
              Frontend создает карточку партии через `POST /api/batches`
            </li>
            <li>
              <span>2</span>
              Файл сертификата уходит через `multipart/form-data`
            </li>
            <li>
              <span>3</span>
              Backend рассчитывает SHA-256 и сохраняет запись в PostgreSQL
            </li>
            <li>
              <span>4</span>
              Пока формируются демо-CID и демо-transaction hash
            </li>
            <li>
              <span>5</span>
              Покупатель открывает публичную проверку по QR-токену
            </li>
          </ol>
        </div>

        <div className="card">
          <h2 className="section-title">Следующий слой</h2>
          <ul className="feature-list">
            <li>заменить демо-CID на реальную загрузку в Pinata/IPFS</li>
            <li>заменить демо-транзакцию на вызов смарт-контракта Polygon Amoy</li>
            <li>добавить экран списка партий из PostgreSQL</li>
            <li>добавить обработку дубликатов номера партии в интерфейсе</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="section-title">Контрольные данные</h2>
          <div className="result-block">
            <div>
              <strong>Текущий хеш:</strong> {shortenHash(fileHash)}
            </div>
            <div>
              <strong>Файл:</strong> {selectedFile?.name ?? "не выбран"}
            </div>
            <div>
              <strong>Статус:</strong>{" "}
              {lastCertificate ? lastCertificate.status : "ожидает загрузки"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
