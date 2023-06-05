import React, { useState, useEffect } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { LinkContainer } from 'react-router-bootstrap';
import './Navigation.css';

const Maps = (props) => (
  <LinkContainer to="Maps">
    <Nav.Link eventKey="/Maps" onSelect={props.navigationToggle}>Visualisasi Probabilitas</Nav.Link>
  </LinkContainer>
);

const Maps2 = (props) => (
  <LinkContainer to="Maps2">
    <Nav.Link eventKey="/Maps2" onSelect={props.navigationToggle}>Cari Coordinat</Nav.Link>
  </LinkContainer>
);


const HowToUse = (props) => (
  <LinkContainer to="/HowToUse">
    <Nav.Link eventKey="HowTouse" onSelect={props.navigationToggle}>How To Use</Nav.Link>
  </LinkContainer>
);

const About = (props) => (
  <LinkContainer to="/About">
    <Nav.Link eventKey="About" onSelect={props.navigationToggle}>About</Nav.Link>
  </LinkContainer>
);

const Navigation = (props) => {
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (currentScrollPos === 0) {
            // Pengguna menggulir ke paling atas
            setShowHeader(true);
          } else {
            // Pengguna menggulir ke bawah
            setShowHeader(false);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <Navbar className='navbar'>
      <Navbar.Brand href="/Maps">SKRIPSI</Navbar.Brand>
      <Navbar.Toggle aria-controls="navbar" />
      <Navbar.Collapse id="navbar">
        <Nav className="ml-auto">
          <Maps navigationToggle={props.navigationToggle} />
          <Maps2 navigationToggle={props.navigationToggle} />
          <HowToUse navigationToggle={props.navigationToggle} />
          <About navigationToggle={props.navigationToggle} />
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Navigation;
