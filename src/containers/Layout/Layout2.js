import React, { Component } from 'react';
import './Layout2.css';
import Navigation from '../../components/Navigation';

class Layout extends Component {
    render = () => (
        <>
            <Navigation />
            <main className="Content2">
                {this.props.children}
            </main>
        </>
    );
};

export default Layout;