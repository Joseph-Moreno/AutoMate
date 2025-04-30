import React from 'react';
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const Login = () => {
  const supabase = useSupabaseClient();

  async function googleSignIn(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) {
      console.error("Error signing in:", error);
    }
  }

  return (
    <div className="login-container">
      <button 
        onClick={googleSignIn}
        className="google-login-button"
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default Login; 