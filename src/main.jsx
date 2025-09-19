
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ProductGallery from './components/ProductGallery.jsx';
import ProductDetail from './components/ProductDetail.jsx';
import { CartProvider } from './components/CartContext.jsx';
import CartPage from './components/CartPage.jsx';
import CartPageWrapper from './components/CartPage.jsx';
import SimpleGallery from './components/SimpleGallery.jsx';
import SuccessPage from './components/SuccessPage.jsx';
import FailurePage from './components/FailurePage.jsx';
import './styles/site.css';

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
