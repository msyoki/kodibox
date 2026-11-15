/** P-05 helpers: landlord statements and MRI tax figures, derived from existing seed data. */
import { seedData } from './seed';
import type { DemoData, Landlord, Property, Remittance } from './types';

export const MRI_DEFAULT_RATE_PCT = 7.5;
export const MRI_PERIOD = '2026-10';
export const MRI_DUE = '2026-11-20';

export interface LandlordSummary {
  landlord: Landlord;
  properties: Property[];
  /** Current (due or remitted) November remittance, if any. */
  current?: Remittance;
  history: Remittance[];
  commercial: boolean;
}

export function listLandlordSummaries(src: DemoData = seedData): LandlordSummary[] {
  return src.landlords.map((landlord) => {
    const properties = src.properties.filter((p) => landlord.propertyIds.includes(p.id));
    const rems = src.remittances
      .filter((r) => r.landlordId === landlord.id)
      .sort((a, b) => b.period.localeCompare(a.period));
    return {
      landlord,
      properties,
      current: rems.find((r) => r.period === '2026-11'),
      history: rems,
      commercial: properties.length > 0 && properties.every((p) => p.kind === 'commercial'),
    };
  });
}

export interface MriRow {
  landlord: Landlord;
  propertyNames: string;
  /** Residential rent received in October, minor units. */
  gross: number;
}

/** Residential landlords only. Commercial properties are excluded from MRI. */
export function listMriRows(src: DemoData = seedData): MriRow[] {
  return listLandlordSummaries(src)
    .filter((s) => !s.commercial)
    .map((s) => ({
      landlord: s.landlord,
      propertyNames: s.properties.map((p) => p.name).join(', '),
      gross: s.history.find((r) => r.period === MRI_PERIOD)?.gross ?? 0,
    }));
}

export function listCommercialExcluded(src: DemoData = seedData) {
  return listLandlordSummaries(src)
    .filter((s) => s.commercial)
    .map((s) => ({
      propertyNames: s.properties.map((p) => p.name).join(', '),
      gross: s.history.find((r) => r.period === MRI_PERIOD)?.gross ?? 0,
    }));
}

/** Tax in minor units at a percentage rate, rounded to the nearest cent. */
export const mriTax = (gross: number, ratePct: number): number =>
  Math.round((gross * ratePct) / 100);
