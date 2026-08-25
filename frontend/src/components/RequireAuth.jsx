import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Usage: <RequireAuth roles={["admin"]}>...</RequireAuth>
// Omit `roles` to just require any logged-in staff account.
export default function RequireAuth({ children, roles }) {
  const { isAuthed, role } = useAuth();

  if (!isAuthed) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/admin/login" replace />;

  return children;
}