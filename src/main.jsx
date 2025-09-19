
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ProductGallery from './components/ProductGallery.jsx';
import ProductDetail from './components/ProductDetail.jsx';
import { CartProvider } from './components/CartContext.jsx';
import CartPage from './components/CartPage.jsx';
import SimpleGallery from './components/SimpleGallery.jsx';
import './styles/site.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/catalog" element={<ProductGallery />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/simple-gallery" element={<SimpleGallery />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>
);
