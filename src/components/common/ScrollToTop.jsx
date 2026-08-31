import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component ensures that:
 * 1. Clean page navigations (e.g. /booking, /my-appointment, /) open at the very top (0, 0) instantly.
 * 2. Section hash links (e.g. /#services, /#barbers, /#location, /#experience, /#trust) smoothly scroll
 *    directly to that specific section with correct navbar offset, even when navigating from other pages.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    // Disable browser's default scroll restoration to avoid erratic jumpiness
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (hash) {
      const targetId = hash.replace('#', '');
      
      const scrollToSection = () => {
        const element = document.getElementById(targetId);
        if (element) {
          const navbarHeight = 75;
          const rect = element.getBoundingClientRect();
          const targetY = window.scrollY + rect.top - navbarHeight;
          
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth',
          });
          return true;
        }
        return false;
      };

      // Try immediately if element is already rendered
      if (!scrollToSection()) {
        // Retry with staggered delays to allow the target page components to mount
        const t1 = setTimeout(scrollToSection, 100);
        const t2 = setTimeout(scrollToSection, 300);
        const t3 = setTimeout(scrollToSection, 600);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }
    } else {
      // Clean page navigation without hash
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    }
  }, [pathname, search, hash]);

  return null;
}
