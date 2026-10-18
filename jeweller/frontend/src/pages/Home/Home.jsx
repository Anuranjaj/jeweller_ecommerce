import HeroSection from './HeroSection';
import TrustBadges from './TrustBadges';
import ShopByCategory from './ShopByCategory';
import BestSellers from './BestSellers';

// Home page — composed of 4 clean, focused sections
const Home = () => {
  return (
    <main>
      <HeroSection />
      <TrustBadges />
      <ShopByCategory />
      <BestSellers />
    </main>
  );
};

export default Home;
