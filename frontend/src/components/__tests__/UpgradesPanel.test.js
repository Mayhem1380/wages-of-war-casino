import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import UpgradesPanel from '../UpgradesPanel';

describe('UpgradesPanel', () => {
  let container;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
    }
  });

  it('loads the default package roster and persists it', () => {
    act(() => {
      const root = ReactDOM.createRoot(container);
      root.render(<UpgradesPanel />);
    });

    const cards = container.querySelectorAll('.upgrade-card');
    expect(cards.length).toBe(21);

    const stored = JSON.parse(localStorage.getItem('wages-of-war-upgrades-v1') || '[]');
    expect(stored.length).toBe(21);
  });

  it('toggles a package between active and inactive', () => {
    localStorage.setItem(
      'wages-of-war-upgrades-v1',
      JSON.stringify([
        {
          id: 'pkg-1',
          name: 'Fleet Upgrade 1',
          description: 'Starter boost',
          price_usd: 199,
          active: true,
          published: false,
        },
      ]),
    );

    act(() => {
      const root = ReactDOM.createRoot(container);
      root.render(<UpgradesPanel />);
    });

    const toggle = container.querySelector('.toggle-upgrade');
    expect(toggle.textContent).toContain('Deactivate');

    act(() => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const status = container.querySelector('.upgrade-status');
    expect(status.textContent).toContain('Inactive');
  });
});
