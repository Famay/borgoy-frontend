import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { getDefaultRouteForRole } from "../utils/auth";

interface LocationState {
  from?: {
    pathname: string;
  };
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = login(form);

    if (!result.success) {
      setError(result.message || "Ошибка входа");
      return;
    }

    const state = location.state as LocationState | null;
    const nextPath = state?.from?.pathname ?? getDefaultRouteForRole(result.user?.role ?? "guest");

    navigate(nextPath, { replace: true });
  };

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--small">
        <div className="auth-card__header">
          <div className="auth-card__badge">VerMeat</div>
          <h1 className="auth-card__title">Вход в систему</h1>
          <p className="auth-card__text">
            Войдите в систему для работы с сертификатами и реестром продукции
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Введите email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Введите пароль"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="button button--primary auth-form__submit">
            Войти
          </button>
        </form>

        <div className="demo-users">
          <div className="demo-users__title">Тестовые учетные записи</div>
          <div className="demo-users__item">
            <strong>Поставщик:</strong> supplier@vermeat.ru / supplier123
          </div>
          <div className="demo-users__item">
            <strong>Админ:</strong> admin@vermeat.ru / admin123
          </div>
        </div>
      </div>
    </section>
  );
}
