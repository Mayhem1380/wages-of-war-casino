import React, { useState } from "react";

const SAMPLE_UPGRADES = Array.from({ length: 21 }).map((_, i) => ({
  id: `pkg-${i + 1}`,
  name: `Fleet Upgrade ${i + 1}`,
  description: `Enhancement package ${i + 1} — custom configuration available.`,
  price_usd: i % 5 === 0 ? 499 + i * 10 : 99 + i * 20,
  active: i < 8,
}));

export default function UpgradesPanel() {
  const [items, setItems] = useState(SAMPLE_UPGRADES);

  const toggleActive = (id) =>
    setItems((s) =>
      s.map((it) => (it.id === id ? { ...it, active: !it.active } : it)),
    );
  const editItem = (id) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const name = window.prompt("Package name:", it.name) || it.name;
    const price = Number(
      window.prompt("Price USD:", String(it.price_usd)) || it.price_usd,
    );
    setItems((s) =>
      s.map((x) =>
        x.id === id
          ? {
              ...x,
              name,
              price_usd: Number.isFinite(price) ? price : x.price_usd,
            }
          : x,
      ),
    );
  };
  const publish = (id) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    window.alert(`Publishing ${it.name} — demo only.`);
  };

  return (
    <div className="upgrades-root">
      <div className="upgrades-header">Upgrades & Packages (21 ready)</div>
      <div className="upgrades-grid">
        {items.map((p) => (
          <div
            key={p.id}
            className={`upgrade-card ${p.active ? "active" : "inactive"}`}
          >
            <div className="upgrade-title">{p.name}</div>
            <div className="upgrade-desc">{p.description}</div>
            <div className="upgrade-price">${p.price_usd}</div>
            <div className="upgrade-actions">
              <button onClick={() => toggleActive(p.id)} className="btn-ghost">
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
