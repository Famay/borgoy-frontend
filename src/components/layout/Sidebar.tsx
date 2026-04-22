import { NavLink } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { navigationItems } from "../../constants/navigation";

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role ?? "guest";
  const items = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">VM</div>
        <div>
          <div className="sidebar__title">VerMeat</div>
          <div className="sidebar__subtitle">Система верификации продукции</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive ? "sidebar__button active" : "sidebar__button"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
