
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ProductGallery from './components/ProductGallery.jsx';
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
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/catalog" element={<SimpleGallery />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPageWrapper />} />
          <Route path="/simple-gallery" element={<SimpleGallery />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/cancel" element={<FailurePage />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>
);
