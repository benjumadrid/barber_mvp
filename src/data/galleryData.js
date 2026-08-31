/**
 * Shop Interior/Exterior Atmosphere & Experience Gallery Data
 * Uses real Nhatty Barber House photos from Dessie Branch.
 */

import interior1 from '../assets/shop_interior_1.jpg';
import interior2 from '../assets/shop_interior_2.jpg';
import interior3 from '../assets/shop_interior_3.jpg';
import toolsImg from '../assets/barber_tools.jpg';
import outdoorImg from '../assets/shop_outdoor.jpg';

export const MOCK_GALLERY_IMAGES = [
  {
    id: 'gal-1',
    title: 'Gold Luxury Styling Stations',
    category: 'Interior Styling',
    caption: 'Ergonomic gold & black leather barber chairs equipped with custom LED mirror styling bays at Nhatty Barber.',
    image: interior1
  },
  {
    id: 'gal-2',
    title: 'Executive Chandelier & Atmosphere',
    category: 'Ambiance',
    caption: 'Modern geometric ceiling architecture, crystal chandelier, and acoustic curated vibes at Nhatty Barber.',
    image: interior2
  },
  {
    id: 'gal-3',
    title: 'Full Master Salon Floor',
    category: 'Salon Space',
    caption: 'Spacious, immaculate salon floor with high-grade leather seating and marble finish at Nhatty Barber.',
    image: interior3
  },
  {
    id: 'gal-4',
    title: 'Professional Wahl Tools & Machines',
    category: 'Pro Equipment',
    caption: 'Medical UV-sterilized clippers, precision detailers, gold shears, and luxury grooming oils at Nhatty Barber.',
    image: toolsImg
  },
  {
    id: 'gal-5',
    title: 'Grand Shop Entrance & Outdoor View',
    category: 'Outdoor & Reception',
    caption: 'Modern glass front entrance with signature neon sign, welcoming reception desk, and ceremonial entrance at Nhatty Barber (Dessie Branch).',
    image: outdoorImg
  }
];
