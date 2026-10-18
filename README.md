# Jewellers Full-Stack E-Commerce Platform

A luxurious, full-stack e-commerce web application built for fine jewelry browsing, shopping, secure checkout, and order management. Featuring a responsive **React (Vite)** single-page application frontend and a robust **Django REST Framework (DRF)** backend API.

---

## Features

### Frontend (React & Vite)
- **Immersive Home & Shop Pages**: Hero banners, category showcases (Rings, Necklaces, Earrings, Bangles, Bracelets, Mangalsutra, Chains), and best-sellers.
- **Product Catalog & Detail View**: Rich product imagery, stock indicators, detailed descriptions, pricing, and category filtering.
- **Cart & Order Management**: Interactive cart management, customer details collection, and secure payment flow.
- **User Authentication**: Secure Login & Registration flows with context-based auth state management.
- **Admin Dashboard**: Comprehensive admin management interface including stock analytics charts (`AdminStockChart`), product addition (`AdminAddProduct`), and order tracking (`AdminOrders`).

### Backend (Django REST Framework)
- **RESTful API Endpoints**: Products, categories, cart/orders, reviews, and authentication.
- **Secure Payment Integration**: Razorpay payment gateway integration supporting test orders, signature verification, and secure webhooks (`/api/payments/webhook/`).
- **Management Commands**: Automated setup script (`setup_admin`) to bootstrap superuser access.
- **Robust Security**: CORS configuration, environment-based secret management, and role-based permissions.

---

## Technology Stack

- **Frontend**: React 18, Vite, React Router, Tailwind/CSS styling, Axios / Fetch API.
- **Backend**: Python 3.x, Django, Django REST Framework (DRF), django-cors-headers, Razorpay Python SDK.
- **Database**: SQLite (Development default).

---

## Project Folder Structure

```text
jewellers/
├── .gitignore
├── README.md
└── jeweller/
    ├── backend/
    │   ├── .env.example
    │   ├── requirements.txt
    │   ├── manage.py
    │   ├── check_admin.py
    │   ├── inspect_data.py
    │   └── jeweller/
    │       ├── settings.py
    │       ├── urls.py
    │       ├── wsgi.py
    │       ├── asgi.py
    │       ├── api/
    │       │   ├── models.py
    │       │   ├── views.py
    │       │   ├── serializers.py
    │       │   ├── urls.py
    │       │   ├── admin.py
    │       │   ├── permissions.py
    │       │   ├── payments.py
    │       │   ├── validators.py
    │       │   ├── tests.py
    │       │   ├── migrations/
    │       │   └── management/commands/setup_admin.py
    │       └── products/        # Product image assets
    └── frontend/
        ├── .env.example
        ├── .gitignore
        ├── package.json
        ├── vite.config.js
        ├── index.html
        ├── public/
        │   ├── favicon.svg
        │   ├── icons.svg
        │   └── images/          # Category and hero banners
        └── src/
            ├── App.jsx
            ├── App.css
            ├── index.css
            ├── main.jsx
            ├── context/         # AuthContext, CartContext
            ├── components/      # Header, Footer
            ├── pages/           # Home, Shop, ProductDetail, Cart, Login, Register, Admin, Aboutus, Collections
            └── services/        # API client and media helpers
```

---

## Prerequisites

- **Python** (v3.8 or higher) installed with `pip`.
- **Node.js** (v18 or higher) and `npm` installed.
- **Git** installed.

---

## Installation & Setup Instructions (Windows)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd jewellers
```

### 2. Backend Setup

Navigate to the backend directory:
```bash
cd jeweller/backend
```

Create and activate a Python virtual environment:
```bash
python -m venv env
env\Scripts\activate
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

Configure environment variables:
- Copy `.env.example` to create a `.env` file in `jeweller/backend/`:
  ```bash
  copy .env.example .env
  ```
- Open `.env` and fill in your configuration (e.g. `SECRET_KEY`, Razorpay test keys if testing payments).

Run database migrations:
```bash
python jeweller/manage.py migrate
```

(Optional) Create a superuser or run the setup admin command:
```bash
python jeweller/manage.py setup_admin
```

Start the Django development server:
```bash
python jeweller/manage.py runserver
```
The backend API will be running at `http://127.0.0.1:8000/`.

---

### 3. Frontend Setup

Open a new terminal window and navigate to the frontend directory:
```bash
cd jeweller/frontend
```

Install frontend dependencies:
```bash
npm install
```

Configure environment variables:
- Copy `.env.example` to create a `.env` file in `jeweller/frontend/`:
  ```bash
  copy .env.example .env
  ```
- Default values point to `http://127.0.0.1:8000/api`.

Start the Vite development server:
```bash
npm run dev
```
The frontend application will be running at `http://5173` (or the port specified in your Vite terminal output).

---

## Available Test & Management Commands

- **Backend Tests**:
  ```bash
  cd jeweller/backend
  python jeweller/manage.py test api
  ```
- **Frontend Build**:
  ```bash
  cd jeweller/frontend
  npm run build
  ```

---

## Security Notes

- Never commit actual `.env` files, production `SECRET_KEY` values, or live payment API secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- Always use `.env.example` templates for configuration sharing.
- Ensure `DEBUG=False` in production environments.

---

## Contribution Guidelines

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
