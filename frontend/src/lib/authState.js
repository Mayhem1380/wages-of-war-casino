export function resolveAuthStateFromError(error) {
  const status = error?.response?.status;

  if (status === 401 || status === 403) {
    return false;
  }

  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return null;
  }

  if (status && status >= 400) {
    return false;
  }

  return null;
}
