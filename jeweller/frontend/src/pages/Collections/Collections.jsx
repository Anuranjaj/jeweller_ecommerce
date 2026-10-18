import Hero from "./Hero";
import CollectionCard from "./CollectionCard";

const COLLECTIONS_DATA = [
  {
    id: 1,
    subtitle: "NEW ARRIVAL",
    title: "Modern Glamour",
    description:"A bold reinterpretation of classic silhouettes. The Modern Glamour collection blends sharp, architectural lines with the soft brilliance of ethically sourced diamonds, designed for the contemporary aesthetic who commands every room.",
    buttonText: "DISCOVER COLLECTION →",
    image:"https://i.pinimg.com/736x/ad/21/cb/ad21cba7121849f7362a4bfdc65642fe.jpg",
    reverse: false,
  },
  {
    id: 2,
    subtitle: "SIGNATURE SERIES",
    title: "Heritage Gold",
    description:
      "Rooted in centuries of goldsmithing tradition, this collection honors the artisanal touch. Each piece features rich, textural details and warm, 18-karat gold, creating heirlooms intended to be passed down through generations.",
    buttonText: "DISCOVER COLLECTION →",
     
    image:
      "https://i.pinimg.com/1200x/0f/7d/b7/0f7db74eeb7612bdb034734565b7180d.jpg",
    reverse: true,
  },
];

const Collections = () => {
  return (
    <main className="bg-white max-w-7xl mx-auto px-6 md:px-12 py-12">
      <Hero />
      <div className="space-y-20">
        {/* Mapping through array and passing item prop */}
        {COLLECTIONS_DATA.map((item) => (
          <CollectionCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
};

export default Collections;