 
const Atelier = () => {
  return (
    <section className="w-full bg-white py-16 sm:py-24 px-6 sm:px-12 lg:px-20 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* Left Column: Text Content */}
        <div className="space-y-6 max-w-xl">
          {/* Eyebrow */}
          <span className="text-xs uppercase tracking-[0.25em] text-[#8C6D46] font-medium block">
            THE ATELIER
          </span>

          {/* Title */}
          <h2 
            className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.15] text-gray-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Mastery in Every Detail.
          </h2>

          {/* Body Text */}
          <div className="space-y-4 text-sm sm:text-base text-gray-600 font-light leading-relaxed pt-2">
            <p>
              Our artisans are the custodians of centuries-old techniques, blended seamlessly with modern precision. From the initial sketch to the final polish, each step is a testament to unwavering dedication.
            </p>
            <p>
              We believe that luxury is not just in the material, but in the time, care, and human touch invested in every creation. It is a dialogue between the maker and the metal.
            </p>
          </div>

          {/* Divider Line */}
          <hr className="border-gray-200 my-8" />

          {/* Artisan Video CTA Block */}
          <div className="flex items-center gap-4 pt-2">
            {/* Overlapping Avatars */}
            <div className="flex -space-x-3">
              <img
                src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=150"
                alt="Artisan 1"
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <img
                src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=150"
                alt="Artisan 2"
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
            </div>

            {/* CTA Label */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900 tracking-wide">
                Meet The Artisans
              </span>
              <button className="text-xs font-medium text-[#8C6D46] hover:text-[#6a5132] transition-colors text-left cursor-pointer">
                Watch Video
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Layered Image Container */}
        <div className="relative pl-6 pb-6 lg:pl-8 lg:pb-8">
          {/* Subtle Layered Background Card */}
          <div className="absolute inset-0 top-12 left-0 right-12 bg-[#EBE9E4] rounded-2xl -z-0" />

          {/* Main Image Container */}
          <div className="relative z-10 rounded-2xl overflow-hidden shadow-sm">
            <img
              src="https://i.pinimg.com/736x/c5/c2/a0/c5c2a05085d9584494cb9b43a7599e34.jpg"
              alt="Diamond Teardrop Necklace"
              className="w-full h-[450px] sm:h-[550px] object-cover"
            />
          </div>
        </div>

      </div>
    </section>
  );
};

export default Atelier;