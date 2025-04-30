// src/GoogleOneTapLogin.js
import { useEffect } from 'react';

const GoogleOneTapLogin = () => {
  useEffect(() => {
    let checkInterval = null;

    function initializeOneTap() {
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id &&
        !window.google.accounts.id._initialized
      ) {
        console.log('✅ Initializing Google One Tap');

        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.prompt();
        window.google.accounts.id._initialized = true; // mark it to avoid re-init
        clearInterval(checkInterval);
      } else if (!window.google) {
        console.log('⏳ Waiting for Google SDK...');
      }
    }

    // Start checking if the SDK is loaded
    checkInterval = setInterval(initializeOneTap, 100);

    // Clean up
    return () => {
      clearInterval(checkInterval);
      if (window.google && window.google.accounts?.id?.cancel) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  function handleCredentialResponse(response) {
    if (response.credential) {
      console.log('✅ Encoded JWT ID token:', response.credential);
    } else {
      console.error('❌ Failed to receive valid credential.');
    }
  }

  return null;
};

export default GoogleOneTapLogin;
