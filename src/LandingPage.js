import React from 'react';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      <h1>Welcome to AutoMate</h1>
      <p>Your personal automotive diagnostic assistant.</p>
      <button onClick={() => window.location.href = '/chat'}>Get Started</button>
      {/* Add an account icon to the landing page */}
      <div className="account-icon">
        <img src="/logo192.png" alt="Account" />
      </div>
    </div>
  );
}

export default LandingPage;
