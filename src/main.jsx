import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from './components/ProfilePage.jsx';
import OrdersDashboard from './components/OrdersDashboard.jsx';
import App from './App.jsx';
import Layout from './components/Layout.jsx';
// import ProductGallery from './components/ProductGallery.jsx';
import ProductDetail from './components/ProductDetail.jsx';
import { CartProvider } from './components/CartContext.jsx';
// import CartPage from './components/CartPage.jsx';
import './styles/site.css';
import SimpleGallery from './components/SimpleGallery.jsx';
import SuccessPage from './components/SuccessPage.jsx';
import FailurePage from './components/FailurePage.jsx';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CartPage from './components/CartPage.jsx';
import OrderSuccess from './components/OrderSuccess.jsx';
import SearchResults from './components/SearchResults.jsx';
import FreightInquiryPage from './components/FreightInquiryPage.jsx';
import ContactPartsSpecialist from './components/ContactPartsSpecialist.jsx';
import RecoverPassword from './components/RecoverPassword.jsx';

const stripePromise = loadStripe('pk_test_51S4XMHBpsFVjn5cM6uD1BRgbmhvLSnfeLPMZcp4EJNQYAQrQea122tUoOAF2exUh0Qu83i8uQj5Yp5zZXlCgj0Fc00LA6gZqpZ');

function CartPageWrapper() {
  return (
    <Elements stripe={stripePromise}>
      <CartPage />
    </Elements>
  );
}


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/catalog" element={<SimpleGallery />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPageWrapper />} />
            <Route path="/simple-gallery" element={<SimpleGallery />} />
            <Route path="/success" element={<OrderSuccess />} />
            <Route path="/cancel" element={<FailurePage />} />
            <Route path="/search-results" element={<SearchResults />} />
            <Route path="/freight-inquiry" element={<FreightInquiryPage />} />
            <Route path="/contact-parts-specialist" element={<ContactPartsSpecialist />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrdersDashboard />} />
            <Route path="/recover-password" element={<RecoverPassword />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>
);
