import axios from "axios";
import { getBackendOriginUrl } from "@/lib/runtime";

const BACKEND_URL = getBackendOriginUrl();

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : "/api",
  withCredentials: true,
});

const inflightGetRequests = new Map();

function getInflightRequestKey(url, config = {}) {
  return JSON.stringify({
    url,
    baseURL: config.baseURL ?? api.defaults.baseURL ?? "",
    params: config.params ?? null,
  });
}

const baseGet = api.get.bind(api);

api.get = (url, config = {}) => {
  const key = getInflightRequestKey(url, config);
  const inFlight = inflightGetRequests.get(key);
  if (inFlight) {
    return inFlight;
  }

  const request = baseGet(url, config).finally(() => {
    inflightGetRequests.delete(key);
  });
  inflightGetRequests.set(key, request);
  return request;
};

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
