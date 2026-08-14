export const CASHIER = {
  root: "cashier-root",
  balance: "cashier-balance",
  tabFiat: "cashier-tab-fiat",
  tabCrypto: "cashier-tab-crypto",
  tabWithdraw: "cashier-tab-withdraw",
  fiatAmount: "cashier-fiat-amount",
  fiatCurrency: "cashier-fiat-currency",
  fiatSubmit: "cashier-fiat-submit",
  cryptoAmount: "cashier-crypto-amount",
  cryptoCurrency: "cashier-crypto-currency",
  cryptoSubmit: "cashier-crypto-submit",
  cryptoAddress: "cashier-crypto-address",
  cryptoQr: "cashier-crypto-qr",
  wdAmount: "cashier-wd-amount",
  wdCurrency: "cashier-wd-currency",
  wdDestination: "cashier-wd-destination",
  wdSubmit: "cashier-wd-submit",
  history: "cashier-history",
};

export const ADMINPAY = {
  tab: "admin-tab-payments",
  txnRow: (id) => `admin-pay-txn-${id}`,
  approve: (id) => `admin-pay-approve-${id}`,
  reject: (id) => `admin-pay-reject-${id}`,
};
