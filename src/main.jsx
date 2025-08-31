
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ProductGallery from './components/ProductGallery.jsx';
import './styles/site.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/catalog" element={<ProductGallery />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
