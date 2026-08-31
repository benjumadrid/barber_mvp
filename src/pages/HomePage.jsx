import React, { useState, useEffect } from 'react';
import { getServices, getBarbers, getShopInfo, getGalleryImages, getSocialPosts } from '../services/mockApi';
import Hero from '../components/home/Hero';
import QuickInfoStrip from '../components/home/QuickInfoStrip';
import ServicesPreview from '../components/home/ServicesPreview';
import BarbersSection from '../components/home/BarbersSection';
import TrustSection from '../components/home/TrustSection';
import ShopExperience from '../components/home/ShopExperience';
import LocationSection from '../components/home/LocationSection';
import SocialProofPreview from '../components/home/SocialProofPreview';
import HomeAppointmentSection from '../components/home/HomeAppointmentSection';
import FinalBookingCTA from '../components/home/FinalBookingCTA';
import NhattyHouseAIFloatingButton from '../components/ai/NhattyHouseAIFloatingButton';

export default function HomePage() {
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [servicesRes, barbersRes, shopRes, galleryRes, socialRes] = await Promise.all([
          getServices(),
          getBarbers(),
          getShopInfo(),
          getGalleryImages(),
          getSocialPosts()
        ]);

        setServices(servicesRes);
        setBarbers(barbersRes);
        setShopInfo(shopRes);
        setGallery(galleryRes);
        setSocialPosts(socialRes);
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  return (
    <div className="w-full">
      {/* 1. Hero Section */}
      <Hero shopInfo={shopInfo} />

      {/* 2. Quick Info Strip & Value Pillars */}
      <QuickInfoStrip shopInfo={shopInfo} />

      {/* 3. Services Preview Menu */}
      <ServicesPreview services={services} />

      {/* 4. Our Barbers Team Showcase */}
      <BarbersSection barbers={barbers} />

      {/* 5. Why Nhatty Barber House / Wahl Trust Section */}
      <TrustSection />

      {/* 6. Shop Atmosphere & Experience Gallery */}
      <ShopExperience gallery={gallery} />

      {/* 7. Location & Interactive Map (Dessie, Ethiopia) */}
      <LocationSection locationData={shopInfo?.location} />

      {/* 8. Social Proof & Video Transformations Preview */}
      <SocialProofPreview posts={socialPosts} />

      {/* 9. Active Confirmed Appointment Section (renders when customer has active booking) */}
      <HomeAppointmentSection />

      {/* 10. High-Converting Final Booking CTA */}
      <FinalBookingCTA />

      {/* 11. Persistent Floating Customer AI Assistant */}
      <NhattyHouseAIFloatingButton />
    </div>
  );
}
