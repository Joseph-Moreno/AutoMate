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
    <button 
      className="login-now-btn"
      onClick={googleSignIn}
      title="Sign in with Google to save your data"
    >
      Sign in with<br />Google
    </button>
  );
};

export default Login; 