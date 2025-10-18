import React from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Categories from './components/Categories.jsx'
import Features from './components/Features.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <main>
        <Categories />
        <Features />
      </main>
      <Footer />
    </>
  )
}
