/**
 * Shop Information & Brand Metadata for Nhatty Barber House MVP
 * LOCATION: Lucy Hotel (Ground Floor), Dessie Branch, Ethiopia.
 * Place Name: Lucy Hotel,desie / ሉሲ ሆቴል - ደሴ
 * Coordinates: Latitude 11.1293, Longitude 39.6372
 * Plus Code: 4JHP+8JH, Dese
 */

export const MOCK_SHOP_INFO = {
  name: 'Nhatty Barber House',
  shortName: 'NHATTY',
  subtitle: 'Barber House',
  branch: 'Dessie Branch',
  heroHeading: 'LOOK GOOD. FEEL GOOD.',
  heroAccent: 'Be Your Best.',
  heroTagline: 'Professional cuts. Premium service. Every time.',
  description: "You're not just booking a haircut. You're booking an experience with a respected, Wahl-certified master barber at Nhatty Barber House (Dessie Branch) at Lucy Hotel.",
  
  // Precise Destination & Location Data (Dessie Branch)
  location: {
    label: 'Location',
    city: 'Dessie Branch',
    country: 'Ethiopia',
    destinationName: 'Nhatty Barber House (Lucy Hotel, Ground Floor)',
    placeName: 'Lucy Hotel,desie / ሉሲ ሆቴል - ደሴ',
    landmark: 'Lucy Hotel (Ground Floor), Near Hote Stadium & Dessie Health Science College (A2 Highway)',
    displayAddress: 'Lucy Hotel (Ground Floor), Dessie Branch, Ethiopia',
    areaDescription: 'Near Hote Stadium, A2 Highway, Central Dessie Branch',
    plusCode: '4JHP+8JH, Dese',
    notes: 'Located directly at Lucy Hotel building, Ground Floor (Dessie Branch). Dedicated client parking & reception.',
    latitude: 11.1293,
    longitude: 39.6372,
    zoomLevel: 17
  },
  
  hours: {
    label: 'Opening Hours',
    schedule: 'Mon - Sun',
    time: '8:00 AM - 8:00 PM',
    status: 'Open Today'
  },
  
  contact: {
    label: 'Call Us',
    phone: '0975 357 881',
    displayPhone: '0975 357 881',
    email: 'contact@nhattybarberhouse.com'
  },

  // Key pillars communicating the high-end experience & certification
  pillars: [
    {
      id: 'pillar-1',
      title: 'PROFESSIONAL BARBERS',
      subtitle: '5+ Years Experience',
      description: 'Master craftsmanship, surgical precision, and Wahl-certified techniques.',
      icon: 'Scissors'
    },
    {
      id: 'pillar-2',
      title: 'PREMIUM SERVICE',
      subtitle: 'VIP Experience',
      description: 'Hot towel steam, bespoke consultations, and complimentary refreshments.',
      icon: 'Armchair'
    },
    {
      id: 'pillar-3',
      title: 'ON TIME EVERY TIME',
      subtitle: 'Zero Waiting',
      description: 'Guaranteed scheduled appointments with respect for your busy lifestyle.',
      icon: 'Clock'
    },
    {
      id: 'pillar-4',
      title: 'CLEAN & SAFE ENVIRONMENT',
      subtitle: 'Hospital Grade',
      description: 'UV-sterilized tools, single-use blades, and immaculate shop hygiene standards.',
      icon: 'ShieldCheck'
    }
  ],

  // Trust highlights
  trustHighlights: [
    {
      title: 'Wahl Certified Master Barbering',
      description: 'Trained under international standard barbering techniques, blade ergonomics, and skin safety protocols.'
    },
    {
      title: 'Respected Reputation in Dessie Branch',
      description: 'Trusted by discerning gentlemen, business leaders, and hotel guests in Dessie Branch who demand impeccable consistency.'
    },
    {
      title: 'Premium Grooming Products',
      description: 'Exclusively using high-grade pomades, nourishing beard oils, and dermatologically tested facial masks.'
    },
    {
      title: 'Atmosphere Designed for Comfort',
      description: 'Modern masculine aesthetic, chilled lounge environment, and acoustic curated vibes.'
    }
  ]
};

/**
 * Universal link to open Lucy Hotel place pin on Google Maps
 * @returns {string} Google Maps place pin URL
 */
export function getGoogleMapsPinUrl() {
  return `https://www.google.com/maps/search/?api=1&query=Lucy+Hotel+Dessie`;
}

/**
 * Universal Turn-by-Turn GPS Directions link to Lucy Hotel (Dessie Branch)
 * @returns {string} Google Maps directions URL
 */
export function getDirectionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=11.1293,39.6372`;
}

/**
 * Helper to generate embedded map URL centered on Lucy Hotel in Dessie Branch
 * @returns {string} Embed URL
 */
export function getMapEmbedUrl() {
  return `https://maps.google.com/maps?q=Lucy+Hotel,desie,Ethiopia&hl=en&z=17&output=embed`;
}
