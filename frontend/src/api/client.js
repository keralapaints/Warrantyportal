import axios from "axios";

// In dev, VITE_API_URL is unset so this falls back to "/api" and Vite's
// proxy (vite.config.js) forwards it to your local backend.
// In production on Render, set VITE_API_URL to your backend's URL, e.g.
// https://kerala-paints-complaint-desk.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || "/api";

// Backend origin without the trailing /api — used to resolve uploaded
// image paths like "/uploads/xxx.jpg" that come back from the API.
const apiOrigin = baseURL.replace(/\/api\/?$/, "");

const client = axios.create({ baseURL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("kp_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("kp_admin_token");
      localStorage.removeItem("kp_admin_name");
      localStorage.removeItem("kp_admin_role");
      if (!window.location.pathname.includes("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

// Turns "/uploads/xxx.jpg" into a full URL pointing at the backend.
// In dev (apiOrigin is "") it just returns the path unchanged, which
// still works because of the Vite proxy.
export function fileUrl(path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  return `${apiOrigin}${path}`;
}

export default client;