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
import AboutPage from "../pages/AboutPage";
import AdminLogsPage from "../pages/AdminLogsPage";
import AdminSuppliersPage from "../pages/AdminSuppliersPage";
import AdminStatusPage from "../pages/AdminStatusPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import BatchesPage from "../pages/BatchesPage";
import BatchDetailsPage from "../pages/BatchDetailsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CertificatesProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/supplier"
                element={
                  <ProtectedRoute allowedRoles={["supplier"]}>
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
                path="/batches"
                element={
                  <ProtectedRoute allowedRoles={["supplier", "admin"]}>
                    <BatchesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/batches/:batchId"
                element={
                  <ProtectedRoute allowedRoles={["supplier", "admin"]}>
                    <BatchDetailsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboardPage />
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

              <Route
                path="/admin/suppliers"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSuppliersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/status"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminStatusPage />
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
