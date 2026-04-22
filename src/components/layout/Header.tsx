import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";

const titles: Record<string, string> = {
  "/": "VerMeat — прототип системы верификации",
  "/supplier": "Кабинет поставщика",
  "/registry": "Реестр сертификатов",
  "/verify": "Проверка подлинности",
  "/profile": "Профиль пользователя",
  "/login": "Вход в систему",
  "/register": "Регистрация поставщика",
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="topbar">
      <div>
        <div className="topbar__label">Дипломный проект</div>
        <h1 className="topbar__title">
          {titles[location.pathname] ?? "VerMeat"}
        </h1>
      </div>

      <div className="topbar__actions">
        {isAuthenticated && user ? (
          <>
            <div className="topbar__user">
              {user.name} ({user.role === "admin" ? "администратор" : "поставщик"})
            </div>
            <button className="button button--secondary" onClick={handleLogout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <button
              className="button button--secondary"
              onClick={() => navigate("/login")}
            >
              Войти
            </button>
            <button
              className="button button--primary"
              onClick={() => navigate("/register")}
            >
              Регистрация
            </button>
          </>
        )}
      </div>
    </header>
  );
}