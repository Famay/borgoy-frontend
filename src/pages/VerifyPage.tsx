import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCertificates } from "../app/CertificatesContext";
import StatusBadge from "../components/ui/StatusBadge";
import { verifyCertificateRequest } from "../services/api";
import type { Certificate } from "../types/certificate";
import { formatFileSize, shortenHash } from "../utils/certificates";

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function extractQrValue(rawValue: string) {
  try {
    const url = new URL(rawValue);

    return (
      url.searchParams.get("token") ??
      url.searchParams.get("query") ??
      rawValue
    );
  } catch {
    return rawValue;
  }
}

export default function VerifyPage() {
  const { certificates } = useCertificates();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const initialQuery = useMemo(() => token ?? "CERT-2026-001", [token]);
  const [query, setQuery] = useState(initialQuery);
  const [found, setFound] = useState<Certificate | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopScanner = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScannerOpen(false);
  }, []);

  const findLocalCertificate = useCallback(
    (value: string) => {
      const normalizedQuery = value.trim().toLowerCase();

      if (!normalizedQuery) {
        return null;
      }

      return (
        certificates.find(
          (item) =>
            item.id.toLowerCase() === normalizedQuery ||
            item.batchNumber.toLowerCase() === normalizedQuery ||
            item.qrToken?.toLowerCase() === normalizedQuery ||
            item.product.toLowerCase().includes(normalizedQuery)
        ) ?? null
      );
    },
    [certificates]
  );

  const runVerification = useCallback(
    async (value: string) => {
      const lookup = value.trim();

      if (!lookup) {
        setFound(null);
        setResultMessage(
          "Введите номер сертификата, партии или QR-токен."
        );
        return;
      }

      setIsChecking(true);

      try {
        const result = await verifyCertificateRequest(lookup);

        if (result.certificate) {
          setFound(result.certificate);
          setResultMessage(result.message);
          return;
        }

        const fallback = findLocalCertificate(lookup);
        setFound(fallback);
        setResultMessage(
          fallback
            ? "API не нашел запись, показан локальный fallback из текущей сессии."
            : result.message
        );
      } catch (error) {
        const fallback = findLocalCertificate(lookup);
        setFound(fallback);
        setResultMessage(
          fallback
            ? "API временно недоступен, показан локальный fallback."
            : error instanceof Error
              ? error.message
              : "Не удалось выполнить проверку"
        );
      } finally {
        setIsChecking(false);
      }
    },
    [findLocalCertificate]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runVerification(initialQuery);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialQuery, runVerification]);

  useEffect(() => {
    if (!isScannerOpen) {
      return;
    }

    let cancelled = false;

    async function startScanner() {
      setScannerError("");

      if (!window.BarcodeDetector) {
        setScannerError(
          "Браузер не поддерживает встроенный QR-сканер. Откройте страницу в Chrome или введите QR-токен вручную."
        );
        setIsScannerOpen(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Браузер не дает доступ к камере.");
        setIsScannerOpen(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "environment",
        },
      });

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (!videoRef.current) {
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const scanFrame = async () => {
        if (cancelled || !videoRef.current) {
          return;
        }

        try {
          const codes = await detector.detect(videoRef.current);
          const rawValue = codes[0]?.rawValue?.trim();

          if (rawValue) {
            const nextQuery = extractQrValue(rawValue);
            setQuery(nextQuery);
            setResultMessage("QR-код считан. Выполняется проверка...");
            stopScanner();
            await runVerification(nextQuery);
            return;
          }
        } catch {
          // Continue scanning: a single failed frame should not close the camera.
        }

        frameRef.current = window.requestAnimationFrame(scanFrame);
      };

      frameRef.current = window.requestAnimationFrame(scanFrame);
    }

    void startScanner().catch((error) => {
      setScannerError(
        error instanceof Error
          ? error.message
          : "Не удалось запустить QR-сканер"
      );
      setIsScannerOpen(false);
    });

    return () => {
      cancelled = true;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [isScannerOpen, runVerification, stopScanner]);

  const resultTitle =
    found?.status === "Подтвержден"
      ? "Сертификат подтвержден"
      : found
        ? "Запись требует внимания"
        : "Запись не найдена";

  const resultDescription =
    resultMessage ||
    (found?.status === "Подтвержден"
      ? "Хеш сертификата совпадает с контрольной записью."
      : found
        ? "Покупателю показывается предупреждение о невозможности подтверждения."
        : "Введите номер сертификата, партии или токен из QR-ссылки.");

  return (
    <section className="page verify-grid">
      <div className="card">
        <h2 className="section-title">Публичная проверка продукции</h2>

        <div className="form-group">
          <label htmlFor="verifyQuery">
            Номер сертификата, партия или QR-токен
          </label>
          <input
            id="verifyQuery"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="CERT-2026-001 или BORG-2026-0241"
          />
        </div>

        <div className="actions-row">
          <button
            className="button button--primary"
            onClick={() => void runVerification(query)}
            disabled={isChecking}
          >
            {isChecking ? "Проверка..." : "Проверить"}
          </button>
          <button
            className="button button--secondary"
            onClick={() => setIsScannerOpen(true)}
            disabled={isScannerOpen}
          >
            {isScannerOpen ? "Камера открыта" : "Сканировать QR"}
          </button>
        </div>

        {scannerError && <div className="form-error">{scannerError}</div>}

        {isScannerOpen && (
          <div className="scanner-panel">
            <video
              ref={videoRef}
              className="scanner-video"
              muted
              playsInline
            />
            <div className="scanner-panel__footer">
              <span>Наведите камеру на QR-код публичной проверки.</span>
              <button className="button button--secondary" onClick={stopScanner}>
                Закрыть камеру
              </button>
            </div>
          </div>
        )}

        <div className="upload-box">
          <div className="upload-box__title">Что проверяется</div>
          <div className="upload-box__text">
            Покупатель получает публичные сведения из PostgreSQL и результат
            сверки хеша сертификата с контрольной записью.
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Результат проверки</h2>

        {found ? (
          <div className="verify-result">
            <div className="verify-result__header">
              <div>
                <div className="verify-result__title">{resultTitle}</div>
                <div className="verify-result__subtitle">
                  {resultDescription}
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
                <div className="detail-card__label">Номер партии</div>
                <div className="detail-card__value">{found.batchNumber}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Поставщик</div>
                <div className="detail-card__value">{found.supplier}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Продукция</div>
                <div className="detail-card__value">{found.product}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Происхождение</div>
                <div className="detail-card__value">{found.originRegion}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Дата производства</div>
                <div className="detail-card__value">{found.productionDate}</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Масса партии</div>
                <div className="detail-card__value">{found.weightKg} кг</div>
              </div>

              <div className="detail-card">
                <div className="detail-card__label">Документ</div>
                <div className="detail-card__value">{found.documentNumber}</div>
              </div>
            </div>

            <div className="blockchain-box">
              <div className="blockchain-box__title">Контрольные данные</div>
              <div className="blockchain-box__row">
                <span>SHA-256 документа</span>
                <strong>{shortenHash(found.hash, 18, 12)}</strong>
              </div>
              <div className="blockchain-box__row">
                <span>IPFS CID</span>
                <strong>{found.ipfsCid ?? "не загружен"}</strong>
              </div>
              <div className="blockchain-box__row">
                <span>Транзакция Polygon Amoy</span>
                <strong>{shortenHash(found.blockchain, 14, 10)}</strong>
              </div>
              <div className="blockchain-box__row">
                <span>Файл</span>
                <strong>
                  {found.fileName ?? "не указан"} ·{" "}
                  {formatFileSize(found.fileSize)}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            {isChecking
              ? "Проверка выполняется..."
              : resultDescription ||
                "Попробуйте CERT-2026-001, BORG-2026-0241 или QR-токен."}
          </div>
        )}
      </div>
    </section>
  );
}
