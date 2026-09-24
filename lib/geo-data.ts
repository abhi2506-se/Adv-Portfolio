// Curated geo data: top countries, their states, and major cities
// India is fully detailed; other countries have major states/cities

export type GeoData = {
  [country: string]: {
    [state: string]: string[]
  }
}

export const GEO_DATA: GeoData = {
  India: {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
    Assam: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat'],
    Bihar: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
    Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba'],
    Delhi: ['New Delhi', 'Najafgarh', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Connaught Place'],
    Goa: ['Panaji', 'Margao', 'Vasco da Gama'],
    Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
    Haryana: ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan'],
    'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag'],
    Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
    Karnataka: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belgaum'],
    Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
    Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'],
    Manipur: ['Imphal'],
    Meghalaya: ['Shillong'],
    Mizoram: ['Aizawl'],
    Nagaland: ['Kohima', 'Dimapur'],
    Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
    Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Chandigarh'],
    Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer'],
    Sikkim: ['Gangtok'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
    Tripura: ['Agartala'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Noida', 'Ghaziabad', 'Prayagraj', 'Aligarh'],
    Uttarakhand: ['Dehradun', 'Haridwar', 'Roorkee', 'Nainital'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  },
  'United States': {
    California: ['San Francisco', 'Los Angeles', 'San Diego', 'San Jose', 'Sacramento'],
    'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
    Texas: ['Houston', 'Austin', 'Dallas', 'San Antonio', 'Fort Worth'],
    Florida: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
    Washington: ['Seattle', 'Spokane', 'Tacoma', 'Bellevue'],
    Illinois: ['Chicago', 'Aurora', 'Naperville', 'Joliet'],
    Georgia: ['Atlanta', 'Savannah', 'Columbus', 'Macon'],
    'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham'],
    Virginia: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond'],
    Massachusetts: ['Boston', 'Worcester', 'Springfield', 'Cambridge'],
    'New Jersey': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth'],
    Pennsylvania: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie'],
    Michigan: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights'],
    Ohio: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo'],
    Colorado: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins'],
  },
  'United Kingdom': {
    England: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Sheffield', 'Bristol', 'Liverpool'],
    Scotland: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
    Wales: ['Cardiff', 'Swansea', 'Newport'],
    'Northern Ireland': ['Belfast', 'Derry'],
  },
  Canada: {
    Ontario: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton'],
    'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond'],
    Quebec: ['Montreal', 'Quebec City', 'Laval', 'Gatineau'],
    Alberta: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
    Manitoba: ['Winnipeg', 'Brandon'],
    Saskatchewan: ['Saskatoon', 'Regina'],
    'Nova Scotia': ['Halifax', 'Sydney'],
  },
  Australia: {
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Canberra'],
    Victoria: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
    Queensland: ['Brisbane', 'Gold Coast', 'Cairns', 'Townsville'],
    'Western Australia': ['Perth', 'Fremantle', 'Bunbury'],
    'South Australia': ['Adelaide', 'Mount Gambier'],
    Tasmania: ['Hobart', 'Launceston'],
  },
  Germany: {
    Bavaria: ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'],
    'North Rhine-Westphalia': ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen'],
    'Baden-Württemberg': ['Stuttgart', 'Karlsruhe', 'Freiburg'],
    Berlin: ['Berlin'],
    Hamburg: ['Hamburg'],
    Hesse: ['Frankfurt', 'Wiesbaden', 'Kassel'],
  },
  Singapore: {
    Singapore: ['Singapore City', 'Jurong East', 'Tampines', 'Woodlands', 'Ang Mo Kio'],
  },
  'United Arab Emirates': {
    Dubai: ['Dubai City', 'Deira', 'Bur Dubai'],
    'Abu Dhabi': ['Abu Dhabi City', 'Al Ain'],
    Sharjah: ['Sharjah City'],
    Ajman: ['Ajman City'],
  },
  'Remote / Worldwide': {
    Remote: ['Fully Remote', 'Work from Home'],
  },
}

export const COUNTRIES = Object.keys(GEO_DATA).sort()

export function getStates(country: string): string[] {
  return Object.keys(GEO_DATA[country] || {}).sort()
}

export function getCities(country: string, state: string): string[] {
  return (GEO_DATA[country]?.[state] || []).sort()
}
