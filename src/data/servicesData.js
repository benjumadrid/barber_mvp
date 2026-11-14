/**
 * Mock Services Data for Nhatty Barber House MVP
 * Uses real local high-resolution assets saved in src/assets/
 */

import faceImg from '../assets/face.jpg';
import beardImg from '../assets/Beared.jpg';
import kidsImg from '../assets/kids_cut.jpg';
import hotTowelImg from '../assets/hot_towel_shave.jpg';

export const MOCK_SERVICES = [
  {
    id: 'srv-1',
    name: 'Hair Cut Only',
    tagline: 'Signature precision cut',
    category: 'haircut',
    price: 400,
    currency: 'ETB',
    duration: '30 min',
    popular: true,
    description: 'Professional precision haircut tailored to your face shape, styled and finished with a clean razor edge line.',
    features: ['Custom consultation', 'Precision clipper & scissor cut', 'Neck shave & warm finish', 'Styling product application'],
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'srv-2',
    name: 'Hair Cut + Face Treatment',
    tagline: 'Fresh cut & deep revitalizing facial',
    category: 'combo',
    price: 500,
    currency: 'ETB',
    duration: '45 min',
    popular: true,
    description: 'Precision haircut combined with a deep pore cleanse, exfoliating black mask, and soothing hot towel steam.',
    features: ['Precision hair cut & taper', 'Deep pore cleanse & black mask', 'Hot towel facial steam', 'Hydrating skin moisturizer'],
    image: faceImg,
    imagePosition: '50% 48%'
  },
  {
    id: 'srv-3',
    name: 'Beard Sculpting & Trim',
    tagline: 'Razor-sharp definition & care',
    category: 'beard',
    price: 300,
    currency: 'ETB',
    duration: '25 min',
    popular: false,
    description: 'Expert beard shaping, straight razor edge lining, hot towel wrap, and nourishing essential beard oil conditioning.',
    features: ['Custom beard shaping', 'Straight razor contouring', 'Warm towel treatment', 'Organic beard oil infusion'],
    image: beardImg
  },
  {
    id: 'srv-4',
    name: 'Nhatty VIP Royal Grooming',
    tagline: 'The ultimate luxury master experience',
    category: 'vip',
    price: 800,
    currency: 'ETB',
    duration: '60 min',
    popular: true,
    description: 'Full bespoke grooming: haircut, beard sculpture, revitalizing facial mask, scalp massage, and premium styling.',
    features: ['Master barber service', 'Complete hair & beard grooming', 'Exfoliating detox facial', 'Relaxing scalp & shoulder massage'],
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'srv-5',
    name: 'Kids & Teens Fresh Cut',
    tagline: 'Modern, patient styling for youth',
    category: 'haircut',
    price: 350,
    currency: 'ETB',
    duration: '25 min',
    popular: false,
    description: 'Gentle, sharp, and trendy cut designed specifically for children and teens with utmost care.',
    features: ['Age-appropriate custom styling', 'Gentle clipper & scissor work', 'Clean line-up', 'Light styling product'],
    image: kidsImg,
    imagePosition: '50% 36%'
  },
  {
    id: 'srv-6',
    name: 'Hot Towel Royal Shave',
    tagline: 'Ultra-smooth clean dome finish',
    category: 'specialty',
    price: 350,
    currency: 'ETB',
    duration: '30 min',
    popular: false,
    description: 'Traditional straight razor head shave with pre-shave oil, eucalyptus hot towels, and cooling post-shave balm.',
    features: ['Pre-shave essential oils', 'Triple hot towel prep', 'Smooth straight razor shave', 'Cooling antiseptic finish'],
    image: hotTowelImg
  }
];
