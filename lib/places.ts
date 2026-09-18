/**
 * States and cities offered under each country.
 *
 * India and the UAE are where the committee actually is, so those are given
 * properly; Saudi Arabia and the smaller Gulf states are given by region or
 * city. Everywhere else asks for a city and nothing more.
 *
 * The city box suggests but never insists — a member somewhere not listed
 * types it and the form still takes it. The state box does insist, because
 * a free-typed state is how a record ends up with "MH", "Maharastra" and
 * "Maharashtra" all meaning one place.
 *
 * Plain data, safe to import from a client component.
 */

export interface Region { name: string; cities: string[] }

/** Konkan first — that is the Society's own coast — then the rest. */
const MAHARASHTRA: string[] = [
  "Pewe", "Guhagar", "Chiplun", "Khed", "Dapoli", "Ratnagiri", "Sangameshwar",
  "Mandangad", "Lanja", "Rajapur", "Kankavli", "Sindhudurg",
  "Mumbai", "Navi Mumbai", "Thane", "Kalyan", "Bhiwandi", "Vasai-Virar",
  "Panvel", "Pune", "Pimpri-Chinchwad", "Nashik", "Nagpur",
  "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur", "Satara", "Sangli",
];

export const STATES: Record<string, Region[]> = {
  IN: [
    { name: "Maharashtra", cities: MAHARASHTRA },
    { name: "Goa", cities: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"] },
    { name: "Karnataka", cities: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Bhatkal"] },
    { name: "Gujarat", cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bharuch", "Bhavnagar"] },
    { name: "Kerala", cities: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kannur", "Malappuram"] },
    { name: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"] },
    { name: "Telangana", cities: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"] },
    { name: "Andhra Pradesh", cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"] },
    { name: "Delhi", cities: ["New Delhi", "Delhi"] },
    { name: "Uttar Pradesh", cities: ["Lucknow", "Kanpur", "Ghaziabad", "Noida", "Agra", "Varanasi", "Aligarh"] },
    { name: "Madhya Pradesh", cities: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"] },
    { name: "Rajasthan", cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"] },
    { name: "West Bengal", cities: ["Kolkata", "Howrah", "Siliguri", "Asansol", "Durgapur"] },
    { name: "Bihar", cities: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"] },
    { name: "Punjab", cities: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"] },
    { name: "Haryana", cities: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"] },
    { name: "Assam", cities: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"] },
    { name: "Odisha", cities: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"] },
    { name: "Jharkhand", cities: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"] },
    { name: "Chhattisgarh", cities: ["Raipur", "Bhilai", "Bilaspur", "Korba"] },
    { name: "Uttarakhand", cities: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"] },
    { name: "Himachal Pradesh", cities: ["Shimla", "Solan", "Dharamshala", "Mandi"] },
    { name: "Jammu & Kashmir", cities: ["Srinagar", "Jammu", "Anantnag", "Baramulla"] },
    { name: "Chandigarh", cities: ["Chandigarh"] },
    { name: "Puducherry", cities: ["Puducherry", "Karaikal"] },
    { name: "Dadra & Nagar Haveli and Daman & Diu", cities: ["Silvassa", "Daman", "Diu"] },
    { name: "Lakshadweep", cities: ["Kavaratti"] },
    { name: "Andaman & Nicobar Islands", cities: ["Port Blair"] },
    { name: "Manipur", cities: ["Imphal"] },
    { name: "Meghalaya", cities: ["Shillong"] },
    { name: "Mizoram", cities: ["Aizawl"] },
    { name: "Nagaland", cities: ["Kohima", "Dimapur"] },
    { name: "Tripura", cities: ["Agartala"] },
    { name: "Sikkim", cities: ["Gangtok"] },
    { name: "Arunachal Pradesh", cities: ["Itanagar"] },
    { name: "Ladakh", cities: ["Leh", "Kargil"] },
  ],

  AE: [
    { name: "Abu Dhabi",      cities: ["Abu Dhabi", "Al Ain", "Ruwais", "Madinat Zayed"] },
    { name: "Dubai",          cities: ["Dubai", "Jebel Ali", "Hatta"] },
    { name: "Sharjah",        cities: ["Sharjah", "Khor Fakkan", "Kalba", "Dhaid"] },
    { name: "Ajman",          cities: ["Ajman"] },
    { name: "Umm Al Quwain",  cities: ["Umm Al Quwain"] },
    { name: "Ras Al Khaimah", cities: ["Ras Al Khaimah"] },
    { name: "Fujairah",       cities: ["Fujairah", "Dibba"] },
  ],

  SA: [
    { name: "Makkah",          cities: ["Jeddah", "Makkah", "Taif"] },
    { name: "Riyadh",          cities: ["Riyadh", "Al Kharj"] },
    { name: "Madinah",         cities: ["Madinah", "Yanbu"] },
    { name: "Eastern Province", cities: ["Dammam", "Al Khobar", "Dhahran", "Jubail", "Al Ahsa"] },
    { name: "Asir",            cities: ["Abha", "Khamis Mushait"] },
    { name: "Tabuk",           cities: ["Tabuk"] },
    { name: "Qassim",          cities: ["Buraidah", "Unaizah"] },
    { name: "Jazan",           cities: ["Jazan"] },
    { name: "Najran",          cities: ["Najran"] },
    { name: "Hail",            cities: ["Hail"] },
  ],

  OM: [
    { name: "Muscat",       cities: ["Muscat", "Seeb", "Muttrah", "Bawshar"] },
    { name: "Dhofar",       cities: ["Salalah"] },
    { name: "Al Batinah",   cities: ["Sohar", "Barka", "Rustaq", "Saham"] },
    { name: "Ad Dakhiliyah", cities: ["Nizwa", "Bahla", "Samail"] },
    { name: "Ash Sharqiyah", cities: ["Sur", "Ibra"] },
    { name: "Al Buraimi",   cities: ["Al Buraimi"] },
    { name: "Ad Dhahirah",  cities: ["Ibri"] },
    { name: "Musandam",     cities: ["Khasab"] },
  ],
};

/** Countries with no state list — the city box is offered on its own. */
export const CITIES_ONLY: Record<string, string[]> = {
  QA: ["Doha", "Al Rayyan", "Al Wakrah", "Umm Salal", "Al Khor"],
  KW: ["Kuwait City", "Hawalli", "Salmiya", "Farwaniya", "Ahmadi", "Jahra"],
  BH: ["Manama", "Muharraq", "Riffa", "Isa Town", "Hamad Town"],
  GB: ["London", "Birmingham", "Manchester", "Leicester", "Bradford", "Glasgow"],
  US: ["New York", "Chicago", "Houston", "Dallas", "Los Angeles", "Atlanta"],
  CA: ["Toronto", "Mississauga", "Brampton", "Vancouver", "Calgary", "Montreal"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  SG: ["Singapore"],
  MY: ["Kuala Lumpur", "Johor Bahru", "Penang", "Ipoh", "Shah Alam"],
};

export function statesOf(countryCode: string): Region[] {
  return STATES[countryCode] ?? [];
}

export function citiesOf(countryCode: string, stateName: string): string[] {
  const regions = STATES[countryCode];
  if (regions) return regions.find((r) => r.name === stateName)?.cities ?? [];
  return CITIES_ONLY[countryCode] ?? [];
}

export function hasStates(countryCode: string): boolean {
  return Boolean(STATES[countryCode]?.length);
}

/** A state is only accepted when the country actually has a list. */
export function isKnownState(countryCode: string, stateName: string): boolean {
  const regions = STATES[countryCode];
  if (!regions) return stateName === "";
  return regions.some((r) => r.name === stateName);
}
