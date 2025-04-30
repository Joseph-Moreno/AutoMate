import React from 'react';
import './LandingPage.css';
import GoogleOneTapLogin from './GoogleOneTapLogin';


function LandingPage() {
  console.log("LandingPage Component Rendered");
  return (
    <div className="landing-page">
      <div className="landing-content">
        <img src={require('./automateiconnew.png')} alt="AutoMate Icon" className="automate-landing-icon" />
        <h1>Welcome to AutoMate</h1>
        <p>Your personal automotive diagnostic assistant.</p>
        <button onClick={() => window.location.href = '/chat'}>Get Started</button>
        <GoogleOneTapLogin />
      </div>
      <div className="account-icon">
        <img src="/logo192.png" alt="Account" />
      </div>
    </div>
  );
}

export default LandingPage;
