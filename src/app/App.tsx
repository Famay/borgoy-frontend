import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CertificatesProvider } from "./CertificatesContext";
import { AuthProvider } from "./AuthContext";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import HomePage from "../pages/HomePage";
import SupplierPage from "../pages/SupplierPage";
import RegistryPage from "../pages/RegistryPage";
import VerifyPage from "../pages/VerifyPage";
import ProfilePage from "../pages/ProfilePage";
import MyCertificatesPage from "../pages/MyCertificatesPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import AdminLogsPage from "../pages/AdminLogsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CertificatesProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/supplier"
                element={
                  <ProtectedRoute allowedRoles={["supplier", "admin"]}>
                    <SupplierPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/registry"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <RegistryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={["supplier", "admin"]}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-certificates"
                element={
                  <ProtectedRoute allowedRoles={["supplier"]}>
                    <MyCertificatesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </CertificatesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
