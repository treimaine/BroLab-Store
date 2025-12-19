// server/config/branding.ts
export const BRAND = {
  name: process.env.BRAND_NAME ?? "BroLab Entertainment",
  email: process.env.BRAND_EMAIL ?? "treigua@brolabentertainment.com",
  address: process.env.BRAND_ADDRESS ?? "Fr, Lille",
  logoPath: process.env.BRAND_LOGO_PATH ?? "https://brolabentertainment.com/logo.png",
};

export const INVOICES_BUCKET = process.env.INVOICES_BUCKET ?? "invoices";
