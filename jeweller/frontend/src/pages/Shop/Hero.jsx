const Hero = () => {
  return (
    <div className="flex flex-col items-center text-center max-w-xl mx-auto py-10 px-4">
      <h2 
        className="text-4xl md:text-5xl font-serif text-gray-900 tracking-tight mb-3"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Curated Collection
      </h2>
      <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-md">
        Discover our full range of meticulously crafted pieces, designed to elevate every moment.
      </p>
    </div>
  );
};

export default Hero;