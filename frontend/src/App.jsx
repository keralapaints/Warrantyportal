import { Routes, Route, Navigate } from "react-router-dom";
import ComplaintForm from "./pages/ComplaintForm.jsx";
import TrackComplaint from "./pages/TrackComplaint.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import HappinessDashboard from "./pages/HappinessDashboard.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ComplaintForm />} />
      <Route path="/track" element={<TrackComplaint />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth roles={["admin"]}>
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/manager"
        element={
          <RequireAuth roles={["manager"]}>
            <ManagerDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/happiness"
        element={
          <RequireAuth roles={["happiness_manager"]}>
            <HappinessDashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}