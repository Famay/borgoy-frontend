import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import {
  getBatchesRequest,
  type BatchListFilters,
  type BatchListItem,
  type ListPagination,
} from "../services/api";

const defaultFilters: BatchListFilters = {
  page: 1,
  pageSize: 10,
  query: "",
};

const defaultPagination: ListPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
  }).format(new Date(value));
}

export default function BatchesPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [filters, setFilters] = useState<BatchListFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<BatchListFilters>(defaultFilters);
  const [pagination, setPagination] =
    useState<ListPagination>(defaultPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  const loadBatches = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await getBatchesRequest(token, appliedFilters);

      setBatches(result.batches);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить партии"
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBatches();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBatches]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters({ ...filters, page: 1 });
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const setPage = (page: number) => {
    setAppliedFilters((current) => ({ ...current, page }));
  };

  return (
    <section className="page">
      <div className="card">
        <div className="section-header">
          <div>
            <h1 className="section-title">
              {isAdmin ? "Все партии" : "Мои партии"}
            </h1>
            <p className="section-subtitle">
              {isAdmin
                ? "Партии всех поставщиков с поиском и постраничной загрузкой."
                : "Созданные вами партии и количество связанных сертификатов."}
            </p>
          </div>
          <button
            className="button button--secondary"
            onClick={() => void loadBatches()}
            disabled={isLoading}
          >
            {isLoading ? "Обновление..." : "Обновить"}
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="list-filters" onSubmit={handleSubmit}>
          <input
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
            placeholder="Номер партии, продукция, регион или поставщик"
          />
          <label>
            <span>На странице</span>
            <select
              value={filters.pageSize}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  pageSize: Number(event.target.value),
                }))
              }
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="actions-row list-filters__actions">
            <button className="button button--primary" type="submit">
              Применить
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={handleReset}
            >
              Сбросить
            </button>
          </div>
        </form>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Партия</th>
                {isAdmin && <th>Поставщик</th>}
                <th>Продукция</th>
                <th>Происхождение</th>
                <th>Дата производства</th>
                <th>Вес</th>
                <th>Сертификаты</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>
                    <div className="table-main">{batch.batchNumber}</div>
                    <div className="table-sub">
                      Создана: {formatDate(batch.createdAt)}
                    </div>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-main">
                        {batch.supplier?.companyName ??
                          batch.supplier?.name ??
                          "-"}
                      </div>
                      <div className="table-sub">
                        {batch.supplier?.email ?? "-"}
                      </div>
                    </td>
                  )}
                  <td>{batch.productName}</td>
                  <td>{batch.originRegion}</td>
                  <td>{batch.productionDate}</td>
                  <td>{batch.weightKg} кг</td>
                  <td>{batch.certificatesTotal}</td>
                  <td>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => navigate(`/batches/${batch.id}`)}
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && batches.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7}>Партии не найдены.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-log-pagination">
          <span>
            Всего партий: {pagination.total}. Страница {pagination.page} из{" "}
            {Math.max(pagination.totalPages, 1)}.
          </span>
          <div className="actions-row">
            <button
              className="button button--secondary"
              onClick={() => setPage(pagination.page - 1)}
              disabled={isLoading || pagination.page <= 1}
            >
              Назад
            </button>
            <button
              className="button button--secondary"
              onClick={() => setPage(pagination.page + 1)}
              disabled={
                isLoading ||
                pagination.totalPages === 0 ||
                pagination.page >= pagination.totalPages
              }
            >
              Далее
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
