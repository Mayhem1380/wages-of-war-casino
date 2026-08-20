import axios from "axios";
import { getBackendOriginUrl } from "@/lib/runtime";

const BACKEND_URL = getBackendOriginUrl();

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : "/api",
  withCredentials: true,
});

export function apiError(detail, fallback = "Operation failed. Try again.") {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
