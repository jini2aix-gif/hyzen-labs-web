export const TREASURY_ARB = 130766;

export const MONTHLY_REALISTIC_BAND = [
  { date: '2026/03', priceLow: 140, priceHigh: 180 },
  { date: '2026/04', priceLow: 160, priceHigh: 220 },
  { date: '2026/05', priceLow: 190, priceHigh: 280 },
  { date: '2026/06', priceLow: 230, priceHigh: 350 },
  { date: '2026/07', priceLow: 300, priceHigh: 450 },
  { date: '2026/08', priceLow: 380, priceHigh: 580 },
  { date: '2026/09', priceLow: 450, priceHigh: 720 },
  { date: '2026/10', priceLow: 600, priceHigh: 950 },
  { date: '2026/11', priceLow: 850, priceHigh: 1300 },
  { date: '2026/12', priceLow: 1100, priceHigh: 1650 },
  { date: '2027/01', priceLow: 1400, priceHigh: 2100 },
  { date: '2027/02', priceLow: 1800, priceHigh: 2800 },
  { date: '2027/03', priceLow: 2500, priceHigh: 3800 }, // Vesting End
  { date: '2027/04', priceLow: 3200, priceHigh: 4500 },
  { date: '2027/05', priceLow: 3800, priceHigh: 5200 },
  { date: '2027/06', priceLow: 4300, priceHigh: 5800 },
  { date: '2027/07', priceLow: 4800, priceHigh: 6300 },
  { date: '2027/08', priceLow: 5200, priceHigh: 6800 },
  { date: '2027/09', priceLow: 5600, priceHigh: 7400 },
  { date: '2027/10', priceLow: 6200, priceHigh: 8200 },
  { date: '2027/11', priceLow: 6800, priceHigh: 9000 },
  { date: '2027/12', priceLow: 7500, priceHigh: 10000 }
].map(item => ({
  ...item,
  valueLow: item.priceLow * TREASURY_ARB,
  valueHigh: item.priceHigh * TREASURY_ARB,
  label: item.date
}));
