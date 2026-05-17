import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { getDefaultRouteForRole } from "../utils/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    inn: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (!form.phone.trim()) {
      setError("Укажите телефон для SMS-кодов входа");
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      name: form.contactName,
      companyName: form.companyName,
      email: form.email,
      phone: form.phone,
      inn: form.inn || undefined,
      password: form.password,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || "Ошибка регистрации");
      return;
    }

    navigate(getDefaultRouteForRole(result.user?.role ?? "supplier"), {
      replace: true,
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__badge">VerMeat</div>
          <h1 className="auth-card__title">Регистрация поставщика</h1>
          <p className="auth-card__text">
            Создайте учетную запись организации, чтобы добавлять партии продукции и сертификаты.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="companyName">Название организации</label>
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder='ООО "Боргойский продукт"'
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactName">Контактное лицо</label>
            <input
              id="contactName"
              type="text"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              placeholder="Иванов Андрей"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="registerEmail">Email</label>
              <input
                id="registerEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@company.ru"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Телефон для SMS-кодов</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="inn">ИНН</label>
            <input
              id="inn"
              type="text"
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
              placeholder="1234567890"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="registerPassword">Пароль</label>
              <input
                id="registerPassword"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Введите пароль"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Повтор пароля</label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                placeholder="Повторите пароль"
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="button button--primary auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
      </div>
    </section>
  );
}
