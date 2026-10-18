import { Gem } from 'lucide-react';

const Hero = () => {
  return (
    <section className="w-full bg-white py-8 sm:py-12 px-4 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Hero Card (Left Column - Spans 2 cols on Desktop) */}
        <div className="lg:col-span-2 relative min-h-[480px] sm:min-h-[560px] rounded-2xl overflow-hidden flex flex-col justify-end p-6 sm:p-10 lg:p-12 text-white group">
          {/* Craftsman Background Image */}
          <img 
            src="https://i.pinimg.com/736x/11/ab/16/11ab168eb69279288a090f49978d162b.jpg" 
            alt="Jewelry Craftsman at work" 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={(e) => {
              e.currentTarget.src = '/images/hero/dailywear-banner.webp';
            }}
          />
          
          {/* Dark Overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

          {/* Text Content */}
          <div className="relative z-20 space-y-4 max-w-xl">
            <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#C6A266] font-medium">
              HERITAGE & VISION
            </span>
            
            <h1 
              className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              A Legacy of Light and Craft.
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-light max-w-lg">
              Founded on the principle that true elegance is timeless, Lumière has been shaping the finest materials into heirlooms for generations.
            </p>
            
            <div className="pt-2">
              <button className="bg-white text-black px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-gray-100 transition-colors duration-300 rounded-sm cursor-pointer">
                READ OUR STORY
              </button>
            </div>
          </div>
        </div>

        {/* Right Column Stack */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Top Right Card - Raw Gemstones Image */}
          <div className="h-[220px] sm:h-[260px] lg:h-[240px] w-full rounded-2xl overflow-hidden relative">
            <img 
              src="https://i.pinimg.com/1200x/4b/bc/70/4bbc70b9bf3a52f4564b471f4298408e.jpg" 
              alt="Raw Gemstones on Slate" 
              className="w-full h-full object-cover "
              onError={(e) => {
                e.currentTarget.src = '/images/categories/necklaces.webp';
              }}
            />
          </div>

          {/* Bottom Right Card - Quality Statement */}
          <div className="flex-1 bg-[#F8F7F4] rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
            <Gem className="w-8 h-8 text-[#8C6D46] mb-4" strokeWidth={1.25} />
            
            <h2 
              className="text-xl sm:text-2xl text-gray-900 font-normal mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Uncompromising Quality
            </h2>
            
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xs font-light">
              Every piece is subjected to rigorous standards before it bears our name.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Hero;