import React from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Categories from './components/Categories.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <Hero />
      <main>
        <Categories />
      </main>
      <Footer />
    </>
  )
}
