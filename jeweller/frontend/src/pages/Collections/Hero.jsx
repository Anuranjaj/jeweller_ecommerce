import { motion } from "framer-motion";

const Hero = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center text-center max-w-xl mx-auto mb-16 px-4"
    >
      <h2
        className="text-4xl md:text-5xl font-serif text-gray-900 tracking-tight mb-3"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Curated Collections
      </h2>
      <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-md">
        Explore our meticulously crafted jewelry lines, each designed to capture a unique essence of timeless elegance.
      </p>
    </motion.div>
  );
};

export default Hero;