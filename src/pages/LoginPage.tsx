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
  const { login, verifyTwoFactorLogin } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState("");
  const [twoFactorPhone, setTwoFactorPhone] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTwoFactorStep = twoFactorChallengeToken.length > 0;

  const navigateAfterLogin = (role: "guest" | "supplier" | "admin") => {
    const state = location.state as LocationState | null;
    const nextPath = state?.from?.pathname ?? getDefaultRouteForRole(role);

    navigate(nextPath, { replace: true });
  };

  const handlePasswordSubmit = async () => {
    const result = await login(form);

    if (result.twoFactorRequired && result.challengeToken) {
      setTwoFactorChallengeToken(result.challengeToken);
      setTwoFactorPhone(result.phoneMasked ?? "");
      setTwoFactorCode("");
      return;
    }

    if (!result.success) {
      setError(result.message || "Ошибка входа");
      return;
    }

    navigateAfterLogin(result.user?.role ?? "guest");
  };

  const handleTwoFactorSubmit = async () => {
    const result = await verifyTwoFactorLogin({
      challengeToken: twoFactorChallengeToken,
      code: twoFactorCode,
    });

    if (!result.success) {
      setError(result.message || "Неверный код подтверждения");
      return;
    }

    navigateAfterLogin(result.user?.role ?? "guest");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (isTwoFactorStep) {
      await handleTwoFactorSubmit();
    } else {
      await handlePasswordSubmit();
    }

    setIsSubmitting(false);
  };

  const resetTwoFactorStep = () => {
    setTwoFactorChallengeToken("");
    setTwoFactorPhone("");
    setTwoFactorCode("");
    setError("");
  };

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--small">
        <div className="auth-card__header">
          <div className="auth-card__badge">VerMeat</div>
          <h1 className="auth-card__title">
            {isTwoFactorStep ? "Подтверждение входа" : "Вход в систему"}
          </h1>
          <p className="auth-card__text">
            {isTwoFactorStep
              ? `Введите 6-значный код, отправленный по SMS${twoFactorPhone ? ` на номер ${twoFactorPhone}` : ""}.`
              : "Войдите в личный кабинет для работы с партиями, сертификатами и проверками продукции."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isTwoFactorStep ? (
            <div className="form-group">
              <label htmlFor="twoFactorCode">Код подтверждения</label>
              <input
                id="twoFactorCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
              />
            </div>
          ) : (
            <>
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
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Введите пароль"
                />
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="button button--primary auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Проверка..."
              : isTwoFactorStep
                ? "Подтвердить"
                : "Войти"}
          </button>

          {isTwoFactorStep && (
            <button
              type="button"
              className="button button--secondary auth-form__submit"
              onClick={resetTwoFactorStep}
              disabled={isSubmitting}
            >
              Вернуться к паролю
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
