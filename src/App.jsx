import React from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
// Categories component removed from main page; still available at /categories route
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <main>
        {/* Categories removed from homepage per request */}
      </main>
      <Footer />
    </>
  )
}
