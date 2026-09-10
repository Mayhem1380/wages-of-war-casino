import axios from "axios";
import { getBackendOriginUrl } from "@/lib/runtime";

const BACKEND_URL = getBackendOriginUrl();

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : "/api",
  withCredentials: true,
});

const inflightGetRequests = new Map();

function normalizeDedupeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeDedupeValue);
  }
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeDedupeValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function canDedupeGet(config = {}) {
  return Object.keys(config).every((key) => ["params", "baseURL"].includes(key));
}

function getInflightRequestKey(url, config = {}) {
  return api.getUri({
    method: "get",
    url,
    ...config,
    params: normalizeDedupeValue(config.params),
  });
}

const baseGet = api.get.bind(api);

api.get = (url, config = {}) => {
  if (!canDedupeGet(config)) {
    return baseGet(url, config);
  }

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
