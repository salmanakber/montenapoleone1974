import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countriesAtlas from 'world-atlas/countries-110m.json';

export interface WorldCountryFeature {
  type: 'Feature';
  id?: string;
  properties: {
    name: string;
    iso_a2: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

const ISO_NUMERIC_TO_A2: Record<string, string> = {
  '036': 'AU',
  '040': 'AT',
  '056': 'BE',
  '076': 'BR',
  '124': 'CA',
  '156': 'CN',
  '208': 'DK',
  '246': 'FI',
  '250': 'FR',
  '276': 'DE',
  '344': 'HK',
  '356': 'IN',
  '360': 'ID',
  '372': 'IE',
  '380': 'IT',
  '392': 'JP',
  '410': 'KR',
  '458': 'MY',
  '484': 'MX',
  '528': 'NL',
  '554': 'NZ',
  '578': 'NO',
  '608': 'PH',
  '616': 'PL',
  '620': 'PT',
  '643': 'RU',
  '682': 'SA',
  '702': 'SG',
  '704': 'VN',
  '710': 'ZA',
  '724': 'ES',
  '752': 'SE',
  '756': 'CH',
  '764': 'TH',
  '784': 'AE',
  '792': 'TR',
  '826': 'GB',
  '840': 'US',
};

const NAME_TO_A2: Record<string, string> = {
  'united states of america': 'US',
  'united states': 'US',
  norway: 'NO',
  italy: 'IT',
  vietnam: 'VN',
  'united kingdom': 'GB',
  germany: 'DE',
  france: 'FR',
  sweden: 'SE',
  denmark: 'DK',
  canada: 'CA',
  australia: 'AU',
  japan: 'JP',
  netherlands: 'NL',
  switzerland: 'CH',
  spain: 'ES',
};

const topology = countriesAtlas as unknown as Topology<{
  countries: GeometryCollection<{ name?: string }>;
}>;

const geoCollection = feature(topology, topology.objects.countries);

export const WORLD_COUNTRY_FEATURES: WorldCountryFeature[] = geoCollection.features
  .filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))
  .map((f) => {
    const idStr = String(f.id ?? '').padStart(3, '0');
    const rawName = String(f.properties?.name || 'Country');
    const isoA2 = ISO_NUMERIC_TO_A2[idStr] || NAME_TO_A2[rawName.toLowerCase()] || '';
    return {
      type: 'Feature',
      id: idStr,
      properties: {
        name: rawName,
        iso_a2: isoA2,
      },
      geometry: f.geometry as WorldCountryFeature['geometry'],
    };
  });
