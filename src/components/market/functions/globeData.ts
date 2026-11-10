// Geography for the GLOBE function: where each tracked commodity is produced,
// its principal export flows, the world's maritime chokepoints, and the home
// city of every index and currency the terminal quotes.
//
// Sites are major producing regions or pricing hubs, not an exhaustive list.
// Flows are drawn as great-circle arcs — a stylised view of who ships to whom,
// not vessel routes.

export interface Site {
  name: string;
  country: string;
  lat: number;
  lon: number;
  note?: string;
}

export interface Flow {
  from: string;
  to: string;
  a: [number, number];
  b: [number, number];
}

export interface CommodityGeo {
  symbol: string;
  /** CFTC root used by the positioning (COT) feed. */
  cot?: string;
  name: string;
  short: string;
  group: "Energy" | "Metals" | "Grains" | "Softs";
  unit: string;
  sites: Site[];
  flows: Flow[];
}

const PORT = {
  rasTanura: [26.64, 50.16] as [number, number],
  ningbo: [29.87, 121.55] as [number, number],
  mumbai: [18.95, 72.84] as [number, number],
  tokyo: [35.45, 139.8] as [number, number],
  rotterdam: [51.95, 4.14] as [number, number],
  houston: [29.3, -94.8] as [number, number],
  santos: [-23.98, -46.3] as [number, number],
  shanghai: [31.23, 121.6] as [number, number],
};

export const COMMODITIES: CommodityGeo[] = [
  {
    symbol: "CLUSD", cot: "CL", name: "WTI Crude Oil", short: "WTI", group: "Energy", unit: "$/bbl",
    sites: [
      { name: "Permian Basin", country: "United States", lat: 31.9, lon: -102.3, note: "Largest US oil field" },
      { name: "Cushing", country: "United States", lat: 35.98, lon: -96.77, note: "WTI delivery and pricing hub" },
      { name: "Bakken", country: "United States", lat: 48.0, lon: -103.0, note: "North Dakota shale" },
      { name: "Gulf of Mexico", country: "United States", lat: 27.5, lon: -90.5, note: "Offshore production" },
      { name: "Athabasca Oil Sands", country: "Canada", lat: 57.0, lon: -111.5, note: "Heavy crude" },
    ],
    flows: [
      { from: "US Gulf Coast", to: "Rotterdam", a: PORT.houston, b: PORT.rotterdam },
      { from: "US Gulf Coast", to: "East Asia", a: PORT.houston, b: PORT.ningbo },
    ],
  },
  {
    symbol: "BZUSD", cot: "BZ", name: "Brent Crude Oil", short: "Brent", group: "Energy", unit: "$/bbl",
    sites: [
      { name: "North Sea", country: "UK / Norway", lat: 60.8, lon: 1.7, note: "Brent benchmark origin" },
      { name: "Ghawar", country: "Saudi Arabia", lat: 25.4, lon: 49.6, note: "Largest conventional oil field" },
      { name: "Rumaila", country: "Iraq", lat: 30.4, lon: 47.4 },
      { name: "Burgan", country: "Kuwait", lat: 29.0, lon: 47.9 },
      { name: "Abu Dhabi", country: "UAE", lat: 24.2, lon: 53.6 },
      { name: "West Siberia", country: "Russia", lat: 61.0, lon: 73.4 },
      { name: "Kashagan", country: "Kazakhstan", lat: 46.2, lon: 51.6 },
      { name: "Niger Delta", country: "Nigeria", lat: 4.8, lon: 6.5 },
      { name: "Santos Basin", country: "Brazil", lat: -25.0, lon: -43.0, note: "Offshore pre-salt" },
      { name: "Orinoco Belt", country: "Venezuela", lat: 8.5, lon: -64.5 },
    ],
    flows: [
      { from: "Persian Gulf", to: "China", a: PORT.rasTanura, b: PORT.ningbo },
      { from: "Persian Gulf", to: "India", a: PORT.rasTanura, b: PORT.mumbai },
      { from: "Persian Gulf", to: "Japan", a: PORT.rasTanura, b: PORT.tokyo },
      { from: "Persian Gulf", to: "Europe", a: PORT.rasTanura, b: PORT.rotterdam },
      { from: "West Africa", to: "Europe", a: [4.3, 6.9], b: PORT.rotterdam },
    ],
  },
  {
    symbol: "NGUSD", cot: "NG", name: "Natural Gas", short: "Nat Gas", group: "Energy", unit: "$/MMBtu",
    sites: [
      { name: "Henry Hub", country: "United States", lat: 29.9, lon: -92.07, note: "US pricing hub" },
      { name: "Marcellus", country: "United States", lat: 41.3, lon: -77.0, note: "Appalachian shale gas" },
      { name: "North Field", country: "Qatar", lat: 26.0, lon: 51.8, note: "Largest gas field, LNG exports" },
      { name: "Yamal", country: "Russia", lat: 70.3, lon: 68.5 },
      { name: "North West Shelf", country: "Australia", lat: -19.6, lon: 116.1, note: "LNG exports" },
      { name: "Galkynysh", country: "Turkmenistan", lat: 37.3, lon: 62.3 },
    ],
    flows: [
      { from: "US Gulf Coast LNG", to: "Europe", a: PORT.houston, b: PORT.rotterdam },
      { from: "Qatar LNG", to: "Japan", a: [25.9, 51.6], b: PORT.tokyo },
      { from: "Australia LNG", to: "Japan", a: [-20.6, 116.7], b: PORT.tokyo },
    ],
  },
  {
    symbol: "GCUSD", cot: "GC", name: "Gold", short: "Gold", group: "Metals", unit: "$/oz",
    sites: [
      { name: "Carlin Trend", country: "United States", lat: 40.9, lon: -116.3, note: "Nevada" },
      { name: "Witwatersrand", country: "South Africa", lat: -26.4, lon: 27.6 },
      { name: "Muruntau", country: "Uzbekistan", lat: 41.5, lon: 64.6, note: "One of the largest open-pit gold mines" },
      { name: "Kalgoorlie Super Pit", country: "Australia", lat: -30.78, lon: 121.5 },
      { name: "Grasberg", country: "Indonesia", lat: -4.05, lon: 137.1, note: "Gold and copper" },
      { name: "Shandong", country: "China", lat: 37.4, lon: 120.4 },
      { name: "Obuasi", country: "Ghana", lat: 6.2, lon: -1.7 },
      { name: "Yanacocha", country: "Peru", lat: -7.0, lon: -78.5 },
      { name: "Olimpiada", country: "Russia", lat: 59.9, lon: 92.9 },
    ],
    flows: [],
  },
  {
    symbol: "SIUSD", cot: "SI", name: "Silver", short: "Silver", group: "Metals", unit: "$/oz",
    sites: [
      { name: "Fresnillo", country: "Mexico", lat: 23.2, lon: -102.9, note: "Mexico is the top silver producer" },
      { name: "Peñasquito", country: "Mexico", lat: 24.65, lon: -101.7 },
      { name: "San Cristóbal", country: "Bolivia", lat: -21.1, lon: -67.2 },
      { name: "Antamina", country: "Peru", lat: -9.5, lon: -77.05 },
      { name: "KGHM Lubin", country: "Poland", lat: 51.4, lon: 16.2 },
      { name: "Cannington", country: "Australia", lat: -21.86, lon: 140.9 },
      { name: "Greens Creek", country: "United States", lat: 58.08, lon: -134.63, note: "Alaska" },
    ],
    flows: [],
  },
  {
    symbol: "HGUSD", cot: "HG", name: "Copper", short: "Copper", group: "Metals", unit: "$/lb",
    sites: [
      { name: "Escondida", country: "Chile", lat: -24.27, lon: -69.07, note: "Largest copper mine" },
      { name: "Chuquicamata", country: "Chile", lat: -22.3, lon: -68.9 },
      { name: "Collahuasi", country: "Chile", lat: -20.98, lon: -68.7 },
      { name: "Cerro Verde", country: "Peru", lat: -16.5, lon: -71.6 },
      { name: "Kolwezi", country: "DR Congo", lat: -10.7, lon: 25.5 },
      { name: "Copperbelt", country: "Zambia", lat: -12.8, lon: 28.2 },
      { name: "Morenci", country: "United States", lat: 33.1, lon: -109.35, note: "Arizona" },
      { name: "Grasberg", country: "Indonesia", lat: -4.05, lon: 137.1 },
      { name: "Norilsk", country: "Russia", lat: 69.3, lon: 88.2 },
      { name: "Oyu Tolgoi", country: "Mongolia", lat: 43.0, lon: 106.85 },
    ],
    flows: [
      { from: "Chile", to: "China", a: [-23.65, -70.4], b: PORT.shanghai },
      { from: "Peru", to: "China", a: [-12.05, -77.15], b: PORT.shanghai },
    ],
  },
  {
    symbol: "PLUSD", cot: "PL", name: "Platinum", short: "Platinum", group: "Metals", unit: "$/oz",
    sites: [
      { name: "Bushveld Complex", country: "South Africa", lat: -25.7, lon: 27.3, note: "Most of the world's platinum" },
      { name: "Great Dyke", country: "Zimbabwe", lat: -18.5, lon: 30.5 },
      { name: "Norilsk", country: "Russia", lat: 69.3, lon: 88.2 },
    ],
    flows: [],
  },
  {
    symbol: "PAUSD", cot: "PA", name: "Palladium", short: "Palladium", group: "Metals", unit: "$/oz",
    sites: [
      { name: "Norilsk", country: "Russia", lat: 69.35, lon: 88.2, note: "Largest palladium source" },
      { name: "Bushveld Complex", country: "South Africa", lat: -24.9, lon: 29.9 },
      { name: "Stillwater", country: "United States", lat: 45.4, lon: -109.9, note: "Montana" },
    ],
    flows: [],
  },
  {
    symbol: "ALIUSD", name: "Aluminum", short: "Aluminum", group: "Metals", unit: "$/t",
    sites: [
      { name: "Shandong smelters", country: "China", lat: 36.8, lon: 118.0, note: "China smelts over half of world aluminum" },
      { name: "Boké bauxite", country: "Guinea", lat: 10.95, lon: -14.3 },
      { name: "Weipa bauxite", country: "Australia", lat: -12.65, lon: 141.87 },
      { name: "Bratsk", country: "Russia", lat: 56.1, lon: 101.6 },
      { name: "Jebel Ali", country: "UAE", lat: 25.0, lon: 55.1 },
      { name: "Saguenay", country: "Canada", lat: 48.4, lon: -71.1, note: "Hydro-powered smelting" },
    ],
    flows: [{ from: "Guinea bauxite", to: "China", a: [10.6, -14.6], b: PORT.shanghai }],
  },
  {
    symbol: "ZCUSX", cot: "ZC", name: "Corn", short: "Corn", group: "Grains", unit: "¢/bu",
    sites: [
      { name: "Corn Belt", country: "United States", lat: 42.0, lon: -93.5, note: "Iowa / Illinois" },
      { name: "Mato Grosso", country: "Brazil", lat: -12.6, lon: -55.7 },
      { name: "Pampas", country: "Argentina", lat: -33.5, lon: -61.5 },
      { name: "Central Ukraine", country: "Ukraine", lat: 49.0, lon: 32.0 },
      { name: "Jilin", country: "China", lat: 43.8, lon: 125.3 },
    ],
    flows: [{ from: "US Gulf", to: "East Asia", a: [29.0, -89.3], b: PORT.tokyo }],
  },
  {
    symbol: "ZSUSX", cot: "ZS", name: "Soybeans", short: "Soybeans", group: "Grains", unit: "¢/bu",
    sites: [
      { name: "Mato Grosso", country: "Brazil", lat: -13.4, lon: -56.4, note: "Brazil is the top exporter" },
      { name: "Illinois", country: "United States", lat: 40.0, lon: -89.0 },
      { name: "Rosario", country: "Argentina", lat: -32.95, lon: -60.65, note: "Crushing and export hub" },
      { name: "Alto Paraná", country: "Paraguay", lat: -25.0, lon: -55.5 },
    ],
    flows: [
      { from: "Brazil", to: "China", a: PORT.santos, b: PORT.shanghai },
      { from: "US Gulf", to: "China", a: [29.0, -89.3], b: PORT.shanghai },
    ],
  },
  {
    symbol: "KEUSX", cot: "KE", name: "Wheat", short: "Wheat", group: "Grains", unit: "¢/bu",
    sites: [
      { name: "Kansas", country: "United States", lat: 38.5, lon: -98.5, note: "Hard red winter wheat" },
      { name: "Black Sea steppe", country: "Russia", lat: 46.5, lon: 41.0, note: "Russia is the top exporter" },
      { name: "Southern Ukraine", country: "Ukraine", lat: 47.3, lon: 33.5 },
      { name: "Saskatchewan", country: "Canada", lat: 51.5, lon: -106.0 },
      { name: "Paris Basin", country: "France", lat: 48.6, lon: 3.0 },
      { name: "Punjab", country: "India", lat: 30.8, lon: 75.8 },
      { name: "Western Australia", country: "Australia", lat: -31.5, lon: 117.5 },
    ],
    flows: [{ from: "Black Sea", to: "Egypt", a: [44.7, 37.8], b: [31.2, 29.9] }],
  },
  {
    symbol: "KCUSX", cot: "KC", name: "Coffee", short: "Coffee", group: "Softs", unit: "¢/lb",
    sites: [
      { name: "Minas Gerais", country: "Brazil", lat: -19.9, lon: -45.5, note: "Largest arabica region" },
      { name: "Central Highlands", country: "Vietnam", lat: 12.7, lon: 108.05, note: "Robusta" },
      { name: "Eje Cafetero", country: "Colombia", lat: 4.8, lon: -75.7 },
      { name: "Sidama", country: "Ethiopia", lat: 6.7, lon: 38.4 },
      { name: "Copán", country: "Honduras", lat: 14.8, lon: -88.8 },
    ],
    flows: [
      { from: "Brazil", to: "Europe", a: PORT.santos, b: [53.5, 9.9] },
      { from: "Brazil", to: "United States", a: PORT.santos, b: [40.6, -74.0] },
    ],
  },
  {
    symbol: "SBUSX", cot: "SB", name: "Sugar", short: "Sugar", group: "Softs", unit: "¢/lb",
    sites: [
      { name: "São Paulo state", country: "Brazil", lat: -21.2, lon: -48.0, note: "Brazil is the top exporter" },
      { name: "Uttar Pradesh", country: "India", lat: 27.0, lon: 80.5 },
      { name: "Isan", country: "Thailand", lat: 15.5, lon: 102.0 },
    ],
    flows: [],
  },
  {
    symbol: "CCUSD", cot: "CC", name: "Cocoa", short: "Cocoa", group: "Softs", unit: "$/t",
    sites: [
      { name: "Côte d'Ivoire", country: "Côte d'Ivoire", lat: 6.5, lon: -5.5, note: "Largest cocoa producer" },
      { name: "Ashanti", country: "Ghana", lat: 6.7, lon: -2.0 },
      { name: "Guayas", country: "Ecuador", lat: -1.5, lon: -79.5 },
      { name: "Sulawesi", country: "Indonesia", lat: -2.5, lon: 120.5 },
    ],
    flows: [{ from: "West Africa", to: "Amsterdam", a: [5.25, -4.0], b: [52.4, 4.8] }],
  },
  {
    symbol: "CTUSX", cot: "CT", name: "Cotton", short: "Cotton", group: "Softs", unit: "¢/lb",
    sites: [
      { name: "Texas High Plains", country: "United States", lat: 33.6, lon: -101.9 },
      { name: "Gujarat", country: "India", lat: 22.5, lon: 71.5 },
      { name: "Xinjiang", country: "China", lat: 41.0, lon: 82.0 },
      { name: "Mato Grosso", country: "Brazil", lat: -14.5, lon: -54.0 },
    ],
    flows: [],
  },
];

export interface Chokepoint extends Site {
  /** Commodity symbols whose trade leans on this passage. */
  commodities: string[];
}

export const CHOKEPOINTS: Chokepoint[] = [
  { name: "Strait of Hormuz", country: "Iran / Oman", lat: 26.57, lon: 56.25, commodities: ["BZUSD", "CLUSD", "NGUSD"], note: "Roughly a fifth of the world's oil passes through; also Qatar's LNG" },
  { name: "Suez Canal", country: "Egypt", lat: 30.6, lon: 32.35, commodities: ["BZUSD", "NGUSD", "KEUSX"], note: "Shortest sea link between Asia and Europe" },
  { name: "Bab el-Mandeb", country: "Yemen / Djibouti", lat: 12.6, lon: 43.3, commodities: ["BZUSD", "NGUSD"], note: "Red Sea gateway to the Suez Canal" },
  { name: "Strait of Malacca", country: "Malaysia / Indonesia", lat: 2.5, lon: 101.0, commodities: ["BZUSD", "NGUSD", "HGUSD"], note: "Main route from the Gulf to East Asia" },
  { name: "Panama Canal", country: "Panama", lat: 9.1, lon: -79.7, commodities: ["CLUSD", "NGUSD", "ZCUSX", "ZSUSX"], note: "US Gulf energy and grain to Asia; draught limits in dry years" },
  { name: "Turkish Straits", country: "Türkiye", lat: 41.1, lon: 29.05, commodities: ["BZUSD", "KEUSX", "ZCUSX"], note: "Black Sea crude and grain exports" },
  { name: "Cape of Good Hope", country: "South Africa", lat: -34.4, lon: 18.5, commodities: ["BZUSD"], note: "Alternative route when the Red Sea is disrupted" },
  { name: "Danish Straits", country: "Denmark", lat: 55.5, lon: 11.0, commodities: ["BZUSD"], note: "Baltic crude exports" },
];

export interface CityQuote {
  symbol: string;
  label: string;
  city: string;
  lat: number;
  lon: number;
}

export const INDEX_CITIES: CityQuote[] = [
  { symbol: "^GSPC", label: "S&P 500", city: "New York", lat: 40.71, lon: -74.01 },
  { symbol: "^GSPTSE", label: "TSX", city: "Toronto", lat: 43.65, lon: -79.38 },
  { symbol: "^MXX", label: "IPC", city: "Mexico City", lat: 19.43, lon: -99.13 },
  { symbol: "^BVSP", label: "Ibovespa", city: "São Paulo", lat: -23.55, lon: -46.63 },
  { symbol: "^FTSE", label: "FTSE 100", city: "London", lat: 51.51, lon: -0.09 },
  { symbol: "^FCHI", label: "CAC 40", city: "Paris", lat: 48.86, lon: 2.35 },
  { symbol: "^GDAXI", label: "DAX", city: "Frankfurt", lat: 50.11, lon: 8.68 },
  { symbol: "^AEX", label: "AEX", city: "Amsterdam", lat: 52.37, lon: 4.9 },
  { symbol: "^SSMI", label: "SMI", city: "Zurich", lat: 47.37, lon: 8.54 },
  { symbol: "^IBEX", label: "IBEX 35", city: "Madrid", lat: 40.42, lon: -3.7 },
  { symbol: "^BSESN", label: "Sensex", city: "Mumbai", lat: 18.93, lon: 72.83 },
  { symbol: "^HSI", label: "Hang Seng", city: "Hong Kong", lat: 22.28, lon: 114.16 },
  { symbol: "000001.SS", label: "Shanghai", city: "Shanghai", lat: 31.23, lon: 121.47 },
  { symbol: "^TWII", label: "TAIEX", city: "Taipei", lat: 25.03, lon: 121.56 },
  { symbol: "^KS11", label: "KOSPI", city: "Seoul", lat: 37.57, lon: 126.98 },
  { symbol: "^N225", label: "Nikkei 225", city: "Tokyo", lat: 35.68, lon: 139.77 },
  { symbol: "^AXJO", label: "ASX 200", city: "Sydney", lat: -33.87, lon: 151.21 },
];

/** One marker per currency, at its central bank. `usdIsBase` pairs are inverted for strength vs USD. */
export const FX_CITIES: (CityQuote & { code: string; usdIsBase: boolean })[] = [
  { code: "EUR", symbol: "EURUSD", label: "EUR", city: "Frankfurt", lat: 50.11, lon: 8.68, usdIsBase: false },
  { code: "GBP", symbol: "GBPUSD", label: "GBP", city: "London", lat: 51.51, lon: -0.09, usdIsBase: false },
  { code: "CHF", symbol: "USDCHF", label: "CHF", city: "Bern", lat: 46.95, lon: 7.45, usdIsBase: true },
  { code: "JPY", symbol: "USDJPY", label: "JPY", city: "Tokyo", lat: 35.68, lon: 139.77, usdIsBase: true },
  { code: "CNY", symbol: "USDCNY", label: "CNY", city: "Beijing", lat: 39.9, lon: 116.4, usdIsBase: true },
  { code: "AUD", symbol: "AUDUSD", label: "AUD", city: "Sydney", lat: -33.87, lon: 151.21, usdIsBase: false },
  { code: "NZD", symbol: "NZDUSD", label: "NZD", city: "Wellington", lat: -41.29, lon: 174.78, usdIsBase: false },
  { code: "CAD", symbol: "USDCAD", label: "CAD", city: "Ottawa", lat: 45.42, lon: -75.7, usdIsBase: true },
  { code: "MXN", symbol: "USDMXN", label: "MXN", city: "Mexico City", lat: 19.43, lon: -99.13, usdIsBase: true },
];
