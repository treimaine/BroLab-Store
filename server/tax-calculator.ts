import { Request, Response } from "express";

// Tax rates by location (simplified - in production use TaxJar, Avalara, etc.)
const TAX_RATES: Record<string, { rate: number; name: string }> = {
  // US States
  'US-CA': { rate: 0.0725, name: 'California Sales Tax' },
  'US-NY': { rate: 0.08, name: 'New York Sales Tax' },
  'US-TX': { rate: 0.0625, name: 'Texas Sales Tax' },
  'US-FL': { rate: 0.06, name: 'Florida Sales Tax' },
  'US-WA': { rate: 0.065, name: 'Washington Sales Tax' },
  
  // EU Countries (VAT)
  'DE': { rate: 0.19, name: 'German VAT' },
  'FR': { rate: 0.20, name: 'French VAT' },
  'GB': { rate: 0.20, name: 'UK VAT' },
  'IT': { rate: 0.22, name: 'Italian VAT' },
  'ES': { rate: 0.21, name: 'Spanish VAT' },
  'NL': { rate: 0.21, name: 'Dutch VAT' },
  
  // Other Countries
  'CA': { rate: 0.13, name: 'Canadian HST' },
  'AU': { rate: 0.10, name: 'Australian GST' },
  'JP': { rate: 0.10, name: 'Japanese Consumption Tax' },
  'IN': { rate: 0.18, name: 'Indian GST' },
  
  // Default for digital goods
  'DEFAULT': { rate: 0.0, name: 'No Tax' }
};

interface TaxCalculationRequest {
  amount: number;
  customerLocation: {
    country: string;
    state?: string;
    postalCode?: string;
  };
  productType: 'digital' | 'physical';
  businessLocation: string;
}

export const calculateTax = async (req: Request, res: Response) => {
  try {
    const { amount, customerLocation, productType, businessLocation }: TaxCalculationRequest = req.body;

    // Determine tax jurisdiction
    let taxKey = customerLocation.country;
    if (customerLocation.country === 'US' && customerLocation.state) {
      taxKey = `US-${customerLocation.state}`;
    }

    const taxInfo = TAX_RATES[taxKey] || TAX_RATES.DEFAULT;

    // Digital goods tax rules
    let shouldChargeTax = false;
    let taxRate = 0;

    if (productType === 'digital') {
      // EU Digital Services Act - charge tax based on customer location
      if (['DE', 'FR', 'GB', 'IT', 'ES', 'NL'].includes(customerLocation.country)) {
        shouldChargeTax = true;
        taxRate = taxInfo.rate;
      }
      // US - charge tax if customer in same state as business
      else if (customerLocation.country === 'US' && businessLocation === `US-${customerLocation.state}`) {
        shouldChargeTax = true;
        taxRate = taxInfo.rate;
      }
      // Other countries - check local digital tax laws
      else if (['CA', 'AU', 'JP', 'IN'].includes(customerLocation.country)) {
        shouldChargeTax = true;
        taxRate = taxInfo.rate;
      }
    } else {
      // Physical goods - always charge tax
      shouldChargeTax = true;
      taxRate = taxInfo.rate;
    }

    const taxAmount = shouldChargeTax ? amount * taxRate : 0;
    const totalAmount = amount + taxAmount;

    res.json({
      subtotal: amount,
      taxRate: taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(totalAmount.toFixed(2)),
      taxName: shouldChargeTax ? taxInfo.name : null,
      taxJurisdiction: taxKey,
      shouldChargeTax
    });

  } catch (error: any) {
    console.error("Tax calculation error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get tax information for a location
export const getTaxInfo = async (req: Request, res: Response) => {
  try {
    const { country, state } = req.query;
    
    let taxKey = country as string;
    if (country === 'US' && state) {
      taxKey = `US-${state}`;
    }

    const taxInfo = TAX_RATES[taxKey] || TAX_RATES.DEFAULT;

    res.json({
      location: taxKey,
      taxRate: taxInfo.rate,
      taxName: taxInfo.name,
      isDigitalTaxable: ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'CA', 'AU', 'JP', 'IN'].includes(country as string) || 
                       (country === 'US' && state)
    });

  } catch (error: any) {
    console.error("Tax info error:", error);
    res.status(500).json({ error: error.message });
  }
};