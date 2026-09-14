import axios from "axios";
import { getBackendOriginUrl } from "@/lib/runtime";

const BACKEND_URL = getBackendOriginUrl();

const client = axios.create({
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
  return Object.keys(config).every((key) =>
    ["url", "method", "params", "baseURL"].includes(key),
  );
}

function normalizeRequestConfig(config = {}) {
  return {
    ...config,
    method: (config.method || "get").toLowerCase(),
    params: normalizeDedupeValue(config.params),
  };
}

function getInflightRequestKey(config = {}) {
  return client.getUri(normalizeRequestConfig(config));
}

const baseRequest = client.request.bind(client);

function request(configOrUrl, config) {
  const requestConfig =
    typeof configOrUrl === "string"
      ? { ...(config || {}), url: configOrUrl }
      : { ...(configOrUrl || {}) };

  const normalizedConfig = normalizeRequestConfig(requestConfig);
  if (
    normalizedConfig.method !== "get" ||
    !canDedupeGet(normalizedConfig)
  ) {
    return typeof configOrUrl === "string"
      ? baseRequest({ ...(config || {}), url: configOrUrl })
      : baseRequest(configOrUrl);
  }

  const key = getInflightRequestKey(normalizedConfig);
  const inFlight = inflightGetRequests.get(key);
  if (inFlight) {
    return inFlight;
  }

  const inFlightRequest = baseRequest(normalizedConfig).finally(() => {
    inflightGetRequests.delete(key);
  });
  inflightGetRequests.set(key, inFlightRequest);
  return inFlightRequest;
}

function api(configOrUrl, config) {
  return request(configOrUrl, config);
}

Object.assign(api, client);

api.defaults = client.defaults;
api.interceptors = client.interceptors;
api.getUri = client.getUri.bind(client);
api.request = request;
api.get = (url, config = {}) =>
  request({ ...(config || {}), method: "get", url });
api.delete = client.delete.bind(client);
api.head = (url, config = {}) =>
  request({ ...(config || {}), method: "head", url });
api.options = client.options.bind(client);
api.post = client.post.bind(client);
api.put = client.put.bind(client);
api.patch = client.patch.bind(client);
api.postForm = client.postForm?.bind(client);
api.putForm = client.putForm?.bind(client);
api.patchForm = client.patchForm?.bind(client);

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
