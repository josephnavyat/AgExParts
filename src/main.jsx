
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
const CategoryPage = lazy(() => import('./components/CategoryPage.jsx'));
const Categories = lazy(() => import('./components/Categories.jsx'));
const FreightInquiryPage = lazy(() => import('./components/FreightInquiryPage.jsx'));
const ContactPartsSpecialist = lazy(() => import('./components/ContactPartsSpecialist.jsx'));
const ProfilePage = lazy(() => import('./components/ProfilePage.jsx'));
const OrdersDashboard = lazy(() => import('./components/OrdersDashboard.jsx'));
const RecoverPassword = lazy(() => import('./components/RecoverPassword.jsx'));
const FreightOrderConfirmation = lazy(() => import('./components/FreightOrderConfirmation.jsx'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage.jsx'));

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
        <Suspense fallback={<div style={{textAlign:'center',marginTop:'3rem'}}>Loading...</div>}>
          <Layout>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/catalog" element={<SimpleGallery />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<CartPageWrapper />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/simple-gallery" element={<SimpleGallery />} />
              <Route path="/success" element={<OrderSuccess />} />
              <Route path="/cancel" element={<FailurePage />} />
              <Route path="/search-results" element={<SearchResults />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/categories/:category" element={<CategoryPage />} />
              <Route path="/freight-inquiry" element={<FreightInquiryPage />} />
              <Route path="/contact-parts-specialist" element={<ContactPartsSpecialist />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/orders" element={<OrdersDashboard />} />
              <Route path="/recover-password" element={<RecoverPassword />} />
              <Route path="/freight-order-confirmation" element={<FreightOrderConfirmation />} />
            </Routes>
          </Layout>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>
);
