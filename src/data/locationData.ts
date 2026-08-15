export interface LocationItem {
  division_id: number;
  division_name: string;
  district_id: number;
  district_name: string;
}

export const locationRawData: LocationItem[] = [
  // 1: Dhaka
  { division_id: 1, division_name: 'Dhaka', district_id: 1, district_name: 'Dhaka' },
  { division_id: 1, division_name: 'Dhaka', district_id: 2, district_name: 'Faridpur' },
  { division_id: 1, division_name: 'Dhaka', district_id: 3, district_name: 'Gazipur' },
  { division_id: 1, division_name: 'Dhaka', district_id: 4, district_name: 'Gopalganj' },
  { division_id: 1, division_name: 'Dhaka', district_id: 5, district_name: 'Kishoreganj' },
  { division_id: 1, division_name: 'Dhaka', district_id: 6, district_name: 'Madaripur' },
  { division_id: 1, division_name: 'Dhaka', district_id: 7, district_name: 'Manikganj' },
  { division_id: 1, division_name: 'Dhaka', district_id: 8, district_name: 'Munshiganj' },
  { division_id: 1, division_name: 'Dhaka', district_id: 9, district_name: 'Narayanganj' },
  { division_id: 1, division_name: 'Dhaka', district_id: 10, district_name: 'Narsingdi' },
  { division_id: 1, division_name: 'Dhaka', district_id: 11, district_name: 'Rajbari' },
  { division_id: 1, division_name: 'Dhaka', district_id: 12, district_name: 'Shariatpur' },
  { division_id: 1, division_name: 'Dhaka', district_id: 13, district_name: 'Tangail' },

  // 2: Chattogram
  { division_id: 2, division_name: 'Chattogram', district_id: 14, district_name: 'Bandarban' },
  { division_id: 2, division_name: 'Chattogram', district_id: 15, district_name: 'Brahmanbaria' },
  { division_id: 2, division_name: 'Chattogram', district_id: 16, district_name: 'Chandpur' },
  { division_id: 2, division_name: 'Chattogram', district_id: 17, district_name: 'Chattogram' },
  { division_id: 2, division_name: 'Chattogram', district_id: 18, district_name: "Cox's Bazar" },
  { division_id: 2, division_name: 'Chattogram', district_id: 19, district_name: 'Cumilla' },
  { division_id: 2, division_name: 'Chattogram', district_id: 20, district_name: 'Feni' },
  { division_id: 2, division_name: 'Chattogram', district_id: 21, district_name: 'Khagrachhari' },
  { division_id: 2, division_name: 'Chattogram', district_id: 22, district_name: 'Lakshmipur' },
  { division_id: 2, division_name: 'Chattogram', district_id: 23, district_name: 'Noakhali' },
  { division_id: 2, division_name: 'Chattogram', district_id: 24, district_name: 'Rangamati' },

  // 3: Rajshahi
  { division_id: 3, division_name: 'Rajshahi', district_id: 25, district_name: 'Bogura' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 26, district_name: 'Joypurhat' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 27, district_name: 'Naogaon' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 28, district_name: 'Natore' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 29, district_name: 'Chapainawabganj' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 30, district_name: 'Pabna' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 31, district_name: 'Rajshahi' },
  { division_id: 3, division_name: 'Rajshahi', district_id: 32, district_name: 'Sirajganj' },

  // 4: Khulna
  { division_id: 4, division_name: 'Khulna', district_id: 33, district_name: 'Bagerhat' },
  { division_id: 4, division_name: 'Khulna', district_id: 34, district_name: 'Chuadanga' },
  { division_id: 4, division_name: 'Khulna', district_id: 35, district_name: 'Jashore' },
  { division_id: 4, division_name: 'Khulna', district_id: 36, district_name: 'Jhenaidah' },
  { division_id: 4, division_name: 'Khulna', district_id: 37, district_name: 'Khulna' },
  { division_id: 4, division_name: 'Khulna', district_id: 38, district_name: 'Kushtia' },
  { division_id: 4, division_name: 'Khulna', district_id: 39, district_name: 'Magura' },
  { division_id: 4, division_name: 'Khulna', district_id: 40, district_name: 'Meherpur' },
  { division_id: 4, division_name: 'Khulna', district_id: 41, district_name: 'Narail' },
  { division_id: 4, division_name: 'Khulna', district_id: 42, district_name: 'Satkhira' },

  // 5: Barishal
  { division_id: 5, division_name: 'Barishal', district_id: 43, district_name: 'Barguna' },
  { division_id: 5, division_name: 'Barishal', district_id: 44, district_name: 'Barishal' },
  { division_id: 5, division_name: 'Barishal', district_id: 45, district_name: 'Bhola' },
  { division_id: 5, division_name: 'Barishal', district_id: 46, district_name: 'Jhalokathi' },
  { division_id: 5, division_name: 'Barishal', district_id: 47, district_name: 'Patuakhali' },
  { division_id: 5, division_name: 'Barishal', district_id: 48, district_name: 'Pirojpur' },

  // 6: Sylhet
  { division_id: 6, division_name: 'Sylhet', district_id: 49, district_name: 'Habiganj' },
  { division_id: 6, division_name: 'Sylhet', district_id: 50, district_name: 'Moulvibazar' },
  { division_id: 6, division_name: 'Sylhet', district_id: 51, district_name: 'Sunamganj' },
  { division_id: 6, division_name: 'Sylhet', district_id: 52, district_name: 'Sylhet' },

  // 7: Rangpur
  { division_id: 7, division_name: 'Rangpur', district_id: 53, district_name: 'Dinajpur' },
  { division_id: 7, division_name: 'Rangpur', district_id: 54, district_name: 'Gaibandha' },
  { division_id: 7, division_name: 'Rangpur', district_id: 55, district_name: 'Kurigram' },
  { division_id: 7, division_name: 'Rangpur', district_id: 56, district_name: 'Lalmonirhat' },
  { division_id: 7, division_name: 'Rangpur', district_id: 57, district_name: 'Nilphamari' },
  { division_id: 7, division_name: 'Rangpur', district_id: 58, district_name: 'Panchagarh' },
  { division_id: 7, division_name: 'Rangpur', district_id: 59, district_name: 'Rangpur' },
  { division_id: 7, division_name: 'Rangpur', district_id: 60, district_name: 'Thakurgaon' },

  // 8: Mymensingh
  { division_id: 8, division_name: 'Mymensingh', district_id: 61, district_name: 'Jamalpur' },
  { division_id: 8, division_name: 'Mymensingh', district_id: 62, district_name: 'Mymensingh' },
  { division_id: 8, division_name: 'Mymensingh', district_id: 63, district_name: 'Netrokona' },
  { division_id: 8, division_name: 'Mymensingh', district_id: 64, district_name: 'Sherpur' },
];

/**
 * Array of 8 Division Names
 */
export const divisionNames: string[] = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

/**
 * Array of 8 Division Names with " Division" suffix
 */
export const divisionNamesWithSuffix: string[] = [
  'Dhaka Division',
  'Chattogram Division',
  'Rajshahi Division',
  'Khulna Division',
  'Barishal Division',
  'Sylhet Division',
  'Rangpur Division',
  'Mymensingh Division',
];

/**
 * Map connecting both "Dhaka" and "Dhaka Division" to the array of 64 districts
 */
export const bangladeshDivisionsAndDistricts: Record<string, string[]> = locationRawData.reduce((acc, curr) => {
  const shortName = curr.division_name;
  const fullName = `${curr.division_name} Division`;

  if (!acc[shortName]) acc[shortName] = [];
  if (!acc[fullName]) acc[fullName] = [];

  if (!acc[shortName].includes(curr.district_name)) {
    acc[shortName].push(curr.district_name);
  }
  if (!acc[fullName].includes(curr.district_name)) {
    acc[fullName].push(curr.district_name);
  }

  return acc;
}, {} as Record<string, string[]>);

/**
 * Get districts array for a given division string
 */
export function getDistrictsForDivision(divisionStr: string): string[] {
  if (!divisionStr) return Object.values(bangladeshDivisionsAndDistricts).flat();
  
  const matchedKey = Object.keys(bangladeshDivisionsAndDistricts).find(
    k => k.toLowerCase() === divisionStr.trim().toLowerCase()
  );

  return matchedKey ? bangladeshDivisionsAndDistricts[matchedKey] : [];
}

/**
 * Array of all 64 unique districts
 */
export const allDistricts: string[] = Array.from(
  new Set(locationRawData.map(item => item.district_name))
);
