import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import Shop from './pages/Shop/Shop';
import Collections from './pages/Collections/Collections';
import Aboutus from './pages/Aboutus/Aboutus';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Cart from './pages/Cart/Cart';
import Admin from './pages/Admin/Admin';

function LayoutWrapper() {
  const location = useLocation();
  // Hide standard header and footer on standalone transactional/admin layouts
  const isCartPage = location.pathname === '/cart';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      {!isCartPage && !isAdminPage && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/Collections" element={<Collections />} />
          <Route path="/About" element={<Aboutus />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
      </main>
      {!isCartPage && !isAdminPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <LayoutWrapper />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;