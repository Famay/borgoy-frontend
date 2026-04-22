import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <Header />
        <Outlet />
      </main>
    </div>
  );
}