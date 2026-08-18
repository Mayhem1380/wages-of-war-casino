export const NAV = {
  logo: "nav-logo",
  lobby: "nav-lobby",
  vip: "nav-vip",
  leaderboard: "nav-leaderboard",
  wallet: "nav-wallet",
  balance: "nav-balance",
  bonusBtn: "nav-daily-bonus",
  muteBtn: "nav-mute-btn",
  loginBtn: "nav-login-btn",
  enlistBtn: "nav-enlist-btn",
  userMenu: "nav-user-menu",
  logoutBtn: "nav-logout-btn",
  profileBtn: "nav-profile-btn",
};

export const AUTHD = {
  dialog: "auth-dialog",
  email: "auth-email",
  password: "auth-password",
  name: "auth-name",
  submit: "auth-submit",
  google: "auth-google-btn",
  toggle: "auth-toggle-mode",
  error: "auth-error",
};

export const LANDING = {
  hero: "landing-hero",
  enlistCta: "landing-enlist-cta",
  enterLobby: "landing-enter-lobby",
  giveaway: "landing-giveaway",
};

export const LOBBY = {
  root: "lobby-root",
  slotCard: (id) => `lobby-slot-${id}`,
  kenoCard: "lobby-keno-card",
  coinflipCard: "lobby-coinflip-card",
  search: "lobby-search",
  tab: (name) => `lobby-tab-${name.toLowerCase()}`,
  empty: "lobby-empty",
  wheelCard: "lobby-wheel-card",
  tournamentCard: "lobby-tournament-card",
};

export const WHEEL = {
  root: "wheel-root",
  spin: "wheel-spin-btn",
  result: "wheel-result",
  streak: "wheel-streak",
  timer: "wheel-timer",
};

export const TOURNEY = {
  root: "tournament-root",
  timer: "tournament-timer",
  pool: "tournament-pool",
  myRank: "tournament-my-rank",
  row: (r) => `tournament-row-${r}`,
};

export const SLOT = {
  root: "slot-root",
  grid: "slot-grid",
  cell: (r, c) => `slot-cell-${r}-${c}`,
  spin: "slot-spin-btn",
  betInput: "slot-bet-input",
  betInc: "slot-bet-inc",
  betDec: "slot-bet-dec",
  win: "slot-win-amount",
  balance: "slot-balance",
  freeOverlay: "slot-free-overlay",
  freeSpinsLeft: "slot-free-spins-left",
  freeMultiplier: "slot-free-multiplier",
  freeWin: "slot-free-total-win",
  freeCollect: "slot-free-collect",
};

export const KENO = {
  root: "keno-root",
  num: (n) => `keno-num-${n}`,
  play: "keno-play-btn",
  clear: "keno-clear-btn",
  quick: "keno-quick-btn",
  stake: "keno-stake-input",
  win: "keno-win-amount",
  balance: "keno-balance",
};

export const COINFLIP = {
  root: "coinflip-root",
  heads: "coinflip-heads",
  tails: "coinflip-tails",
  flip: "coinflip-flip-btn",
  bet: "coinflip-bet-input",
  result: "coinflip-result",
};

export const WALLET = {
  root: "wallet-root",
  balance: "wallet-balance",
  pkg: (id) => `wallet-pkg-${id}`,
  buy: (id) => `wallet-buy-${id}`,
  txn: "wallet-txn-list",
  cashback: "wallet-cashback-card",
  cashbackClaim: "wallet-cashback-claim",
};

export const BIGWIN = { overlay: "bigwin-overlay", amount: "bigwin-amount" };

export const VIPT = { root: "vip-root", tier: (r) => `vip-tier-${r}` };
export const LB = { root: "leaderboard-root", row: (r) => `lb-row-${r}` };
export const PROFILE = { root: "profile-root" };
export const RG = { root: "responsible-gaming-root" };

export const FLEET = {
  root: "fleet-root",
  name: "fleet-name",
  company: "fleet-company",
  email: "fleet-email",
  country: "fleet-country",
  message: "fleet-message",
  submit: "fleet-submit",
  success: "fleet-success",
};
