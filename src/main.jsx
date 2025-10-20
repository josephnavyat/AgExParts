
import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './components/CartContext.jsx';
import './styles/site.css';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const App = lazy(() => import('./App.jsx'));
const Layout = lazy(() => import('./components/Layout.jsx'));
const SimpleGallery = lazy(() => import('./components/SimpleGallery.jsx'));
const ProductDetail = lazy(() => import('./components/ProductDetail.jsx'));
const CartPage = lazy(() => import('./components/CartPage.jsx'));
const OrderSuccess = lazy(() => import('./components/OrderSuccess.jsx'));
const SuccessPage = lazy(() => import('./components/SuccessPage.jsx'));
const FailurePage = lazy(() => import('./components/FailurePage.jsx'));
const SearchResults = lazy(() => import('./components/SearchResults.jsx'));
const FreightInquiryPage = lazy(() => import('./components/FreightInquiryPage.jsx'));
const ContactPartsSpecialist = lazy(() => import('./components/ContactPartsSpecialist.jsx'));
const ProfilePage = lazy(() => import('./components/ProfilePage.jsx'));
const OrdersDashboard = lazy(() => import('./components/OrdersDashboard.jsx'));
const RecoverPassword = lazy(() => import('./components/RecoverPassword.jsx'));
const FreightOrderConfirmation = lazy(() => import('./components/FreightOrderConfirmation.jsx'));

const stripePromise = loadStripe('pk_test_51S4XMHBpsFVjn5cM6uD1BRgbmhvLSnfeLPMZcp4EJNQYAQrQea122tUoOAF2exUh0Qu83i8uQj5Yp5zZXlCgj0Fc00LA6gZqpZ');


function CartPageWrapper() {
  return (
    <Elements stripe={stripePromise}>
      <CartPage />
    </Elements>
  );
}


createRoot(document.getElementById('root')).render(
  <div style={{color: 'red', fontSize: '2rem', textAlign: 'center', marginTop: '4rem'}}>Hello World</div>
);
