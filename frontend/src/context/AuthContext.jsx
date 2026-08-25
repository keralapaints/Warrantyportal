import { createContext, useContext, useState, useCallback } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("kp_admin_token"));
  const [name, setName] = useState(() => localStorage.getItem("kp_admin_name") || "");
  const [role, setRole] = useState(() => localStorage.getItem("kp_admin_role") || "");

  const login = useCallback(async (username, password) => {
    const { data } = await client.post("/auth/login", { username, password });
    localStorage.setItem("kp_admin_token", data.token);
    localStorage.setItem("kp_admin_name", data.admin.name);
    localStorage.setItem("kp_admin_role", data.admin.role);
    setToken(data.token);
    setName(data.admin.name);
    setRole(data.admin.role);
    return data.admin.role;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("kp_admin_token");
    localStorage.removeItem("kp_admin_name");
    localStorage.removeItem("kp_admin_role");
    setToken(null);
    setName("");
    setRole("");
  }, []);

  return (
    <AuthContext.Provider value={{ token, name, role, isAuthed: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
