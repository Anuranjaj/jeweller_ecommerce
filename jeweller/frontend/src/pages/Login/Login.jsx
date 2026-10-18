import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Register from '../Register/Register';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const isRegistering = location.pathname === '/register' || location.search.includes('mode=register');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        setMessage('Welcome back! Logging in...');
        const isStaff = Boolean(result.user?.is_staff || result.user?.is_superuser);
        const redirectParam = new URLSearchParams(location.search).get('redirect');
        setTimeout(() => {
          if (redirectParam) {
            navigate(redirectParam);
          } else if (isStaff) {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 700);
      } else {

        setError(result.error || 'Invalid email or password.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistering) {
    return <Register />;
  }

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col md:flex-row font-body">
      {/* Left Side: Framed Editorial Image Canvas */}
      <div className=" hidden md:flex md:w-5/12  items-center justify-center p-6 md:p-8 lg:p-12">
        <div className="relative w-full max-w-sm h-[480px] lg:h-[600px] rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30">
          <div
            className="absolute inset-0 bg-cover bg-center w-full h-ful\ transform hover:scale-105 transition-transform duration-700"
            data-alt="A luxurious fine jewelry engagement ring on white Calacatta marble"
            style={{
              backgroundImage:
                "url('https://i.pinimg.com/1200x/5a/4d/c0/5a4dc07f54c1ba0b4174f081ad24b422.jpg')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/20 to-transparent"></div>
        </div>
      </div>

      {/* Right Side: Login Form Canvas */}
      <div className="w-full md:w-7/12 flex flex-col justify-center items-center px-margin-mobile py-stack-lg md:px-margin-desktop lg:px-20 bg-surface relative min-h-screen">
        {/* Return Button */}
        <Link
          className="absolute top-8 left-8 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 group"
          to="/"
        >
          <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">
            arrow_back
          </span>
          <span className="font-label-caps text-label-caps">Return</span>
        </Link>

        <div className="w-full max-w-[420px] pt-12 md:pt-0">
          {/* Brand Anchor */}
          <div className="mb-10 text-center">
            <h1 className="font-headline-sm text-headline-sm tracking-[0.2em] uppercase text-on-background">
              Lumière
            </h1>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-3">
              Welcome Back
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Sign in to access your curated collection and manage your preferences.
            </p>
          </div>

          {/* Status Messages */}
          {message && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded text-center">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form action="#" className="space-y-6" method="POST" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="relative group">
              <label
                className="font-label-caps text-label-caps text-on-surface-variant block mb-1 transition-colors group-focus-within:text-primary-container"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2.5 px-0 font-body-md text-body-md text-on-surface focus:ring-0 focus:border-primary-container focus:outline-none transition-colors placeholder:text-surface-dim"
                id="email"
                name="email"
                placeholder="eleanor@example.com"
                required
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password Field */}
            <div className="relative group">
              <div className="flex items-center justify-between mb-1">
                <label
                  className="font-label-caps text-label-caps text-on-surface-variant block transition-colors group-focus-within:text-primary-container"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  className="text-xs text-primary-container underline decoration-1 underline-offset-4 hover:text-on-surface transition-colors"
                  href="#forgot-password"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot Password?
                </a>
              </div>
              <input
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2.5 px-0 font-body-md text-body-md text-on-surface focus:ring-0 focus:border-primary-container focus:outline-none transition-colors placeholder:text-surface-dim"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                className="w-full bg-on-surface text-surface font-button text-button uppercase py-[16px] px-[36px] hover:bg-on-surface-variant hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Create Account Link */}
          <div className="mt-6 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant text-xs">
              New to Lumière?{' '}
              <Link
                className="text-on-surface font-medium underline decoration-1 underline-offset-4 hover:text-primary-container transition-colors ml-1 cursor-pointer"
                to="/register"
              >
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;