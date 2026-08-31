import React, { useEffect, useMemo, useState } from "react";
import api, { apiError } from "../lib/api";

const STORAGE_KEY = "wages-of-war-upgrades-v1";

const DEFAULT_UPGRADES = Array.from({ length: 21 }).map((_, i) => ({
  id: `pkg-${i + 1}`,
  name: `Fleet Upgrade ${i + 1}`,
  description: `Enhancement package ${i + 1} — custom configuration available.`,
  price_usd: i % 5 === 0 ? 499 + i * 10 : 99 + i * 20,
  active: i < 8,
  published: i < 3,
}));

export default function UpgradesPanel() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn("UpgradesPanel: ignoring malformed local data", error);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_UPGRADES));
    return DEFAULT_UPGRADES;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const { data } = await api.get("/admin/upgrades");
        if (Array.isArray(data) && data.length > 0 && live) {
          setItems(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (error) {
        console.warn(
          "upgrade load failed, falling back to local state:",
          apiError(error.response?.data?.detail || error),
        );
      }
    };

    load();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const activeCount = useMemo(
    () => items.filter((item) => item.active).length,
    [items],
  );

  const persist = async (nextItems) => {
    try {
      const { data } = await api.post("/admin/upgrades", nextItems);
      return data;
    } catch (error) {
      console.warn("upgrade save failed:", apiError(error.response?.data?.detail || error));
      return nextItems;
    }
  };

  const toggleActive = async (id) => {
    const next = items.map((it) =>
      it.id === id ? { ...it, active: !it.active, published: true } : it,
    );
    setItems(next);
    await persist(next);
  };

  const editItem = async (id) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;

    const name = window.prompt("Package name:", it.name) || it.name;
    const price = Number(
      window.prompt("Price USD:", String(it.price_usd)) || it.price_usd,
    );

    const next = items.map((x) =>
      x.id === id
        ? {
            ...x,
            name,
            price_usd: Number.isFinite(price) ? price : x.price_usd,
          }
        : x,
    );
    setItems(next);
    await persist(next);
  };

  const publish = async (id) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;

    const next = items.map((x) =>
      x.id === id ? { ...x, published: true, active: true } : x,
    );
    setItems(next);
    await persist(next);
    window.alert(`Publishing ${it.name} — ready for fleet rollout.`);
  };

  return (
    <div className="upgrades-root">
      <div className="upgrades-header">
        Upgrades & Packages ({items.length} ready · {activeCount} active)
      </div>
      {loading && <div className="upgrade-status">Loading packages…</div>}
      <div className="upgrades-grid">
        {items.map((p) => (
          <div
            key={p.id}
            className={`upgrade-card ${p.active ? "active" : "inactive"}`}
          >
            <div className="upgrade-title">{p.name}</div>
            <div className="upgrade-desc">{p.description}</div>
            <div className="upgrade-price">${p.price_usd}</div>
            <div className="upgrade-status">
              {p.published ? "Published" : "Draft"} · {p.active ? "Active" : "Inactive"}
            </div>
            <div className="upgrade-actions">
              <button
                onClick={() => toggleActive(p.id)}
                className="btn-ghost toggle-upgrade"
              >
                {p.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => editItem(p.id)} className="btn-primary">
                Edit
              </button>
              <button
                onClick={() => publish(p.id)}
                className="btn-primary small"
              >
                Publish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
