export const TREASURY_ARB = 130767;

export const MONTHLY_REALISTIC_BAND = [
  { date: '2026-03', priceLow: 140, priceTarget: 154, priceHigh: 180 },
  { date: '2026-04', priceLow: 150, priceTarget: 180, priceHigh: 250 },
  { date: '2026-05', priceLow: 180, priceTarget: 250, priceHigh: 380 },
  { date: '2026-06', priceLow: 170, priceTarget: 240, priceHigh: 400 },
  { date: '2026-07', priceLow: 160, priceTarget: 230, priceHigh: 420 },
  { date: '2026-08', priceLow: 250, priceTarget: 350, priceHigh: 550 },
  { date: '2026-09', priceLow: 400, priceTarget: 600, priceHigh: 900 },
  { date: '2026-10', priceLow: 550, priceTarget: 850, priceHigh: 1300 },
  { date: '2026-11', priceLow: 700, priceTarget: 1000, priceHigh: 1600 },
  { date: '2026-12', priceLow: 800, priceTarget: 1200, priceHigh: 1800 },
  { date: '2027-01', priceLow: 1200, priceTarget: 2000, priceHigh: 3200 },
  { date: '2027-02', priceLow: 1800, priceTarget: 2800, priceHigh: 4500 },
  { date: '2027-03', priceLow: 2500, priceTarget: 3500, priceHigh: 5500 },
  { date: '2027-04', priceLow: 3200, priceTarget: 4500, priceHigh: 6800 },
  { date: '2027-05', priceLow: 3800, priceTarget: 5000, priceHigh: 7500 },
  { date: '2027-06', priceLow: 4200, priceTarget: 5500, priceHigh: 7800 },
  { date: '2027-07', priceLow: 4000, priceTarget: 5200, priceHigh: 7200 },
  { date: '2027-08', priceLow: 4800, priceTarget: 6500, priceHigh: 8500 },
  { date: '2027-09', priceLow: 5500, priceTarget: 7200, priceHigh: 9800 },
  { date: '2027-10', priceLow: 6000, priceTarget: 8500, priceHigh: 11000 },
  { date: '2027-11', priceLow: 6500, priceTarget: 9500, priceHigh: 13000 },
  { date: '2027-12', priceLow: 5000, priceTarget: 7500, priceHigh: 12000 }
].map(item => ({
  ...item,
  valueLow: item.priceLow * TREASURY_ARB,
  valueTarget: item.priceTarget * TREASURY_ARB,
  valueHigh: item.priceHigh * TREASURY_ARB,
  label: item.date
}));
