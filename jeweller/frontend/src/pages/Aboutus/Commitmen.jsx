import { Globe, RefreshCw, HandHeart } from 'lucide-react';

const commitments = [
  {
    icon: Globe,
    title: "Ethical Sourcing",
    description:
      "We partner exclusively with mines and suppliers that adhere to the strictest environmental and human rights standards.",
  },
  {
    icon: RefreshCw,
    title: "Recycled Metals",
    description:
      "A significant portion of our gold and silver is refined from post-consumer sources, reducing our ecological footprint.",
  },
  {
    icon: HandHeart,
    title: "Community Impact",
    description:
      "We reinvest in the communities where our materials originate, supporting education and sustainable development.",
  },
];

const Commitmen = () => {
  return (
    <section className="w-full bg-white py-16 sm:py-24 px-6 sm:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D46] font-semibold block">
            OUR COMMITMENT
          </span>
          <h2 
            className="text-4xl sm:text-5xl font-normal text-gray-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Beauty with a Conscience.
          </h2>
        </div>

        {/* 3-Column Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {commitments.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={index}
                className="bg-[#FAFAFA] rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center transition-all duration-300 hover:shadow-sm"
              >
                {/* Circular Icon Container */}
                <div className="w-14 h-14 rounded-full bg-[#F3EFEA] flex items-center justify-center mb-6">
                  <IconComponent className="w-6 h-6 text-[#8C6D46]" strokeWidth={1.5} />
                </div>

                {/* Card Title */}
                <h3 
                  className="text-xl sm:text-2xl text-gray-900 font-normal mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed max-w-xs">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default Commitmen;