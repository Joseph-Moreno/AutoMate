import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import Login from './Login';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

function LandingPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabaseClient();
  const session = useSession();

  console.log("LandingPage Component Rendered");

  useEffect(() => {
    if (session) {
      setUser(session.user);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    // Handle user persistence
    const handleUserData = async () => {
      if (user) {
        try {
          // Check if user exists in database
          const { data: existingUsers, error: fetchError } = await supabase
            .from('users')
            .select()
            .eq('email', user.email);

          if (fetchError) {
            console.error('Error fetching user:', fetchError);
            return;
          }

          if (!existingUsers || existingUsers.length === 0) {
            // User doesn't exist, insert new user
            const { error: insertError } = await supabase.from('users').upsert(
              [
                {
                  email: user.email,
                  name: user.user_metadata?.full_name || user.email,
                  img_url: user.user_metadata?.avatar_url || '',
                }
              ],
              { onConflict: 'email' }
            );

            if (insertError) {
              console.error('Error inserting user:', insertError);
            }
          } else {
            // User exists, store in localStorage
            window.localStorage.setItem(
              'user',
              JSON.stringify({
                email: existingUsers[0].email,
                name: existingUsers[0].name,
                img_url: existingUsers[0].img_url,
                req_date: existingUsers[0].req_date,
              })
            );
          }
        } catch (error) {
          console.error('Error handling user data:', error);
        }
      }
    };

    handleUserData();
  }, [user, supabase]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGetStarted = () => {
    window.location.href = '/chat';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1 className="logo">
          AutoMate
          <img src={require('./automateiconnew.png')} alt="AutoMate Icon" className="automate-icon" />
        </h1>
        <div className="auth-section">
          {user ? (
            <div className="user-profile">
              {user.user_metadata?.avatar_url && (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="profile-image" 
                />
              )}
              <span className="username">{user.user_metadata?.full_name || user.email}</span>
              <button className="sign-out-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <Login />
          )}
        </div>
      </header>

      <main className="hero">
        <div className="hero-content">
          <h2>Your AI-Powered Car Maintenance Assistant</h2>
          <p>
            Get expert advice on common car problems, maintenance tips, and
            step-by-step repair guidance, all tailored to your specific vehicle.
          </p>
          <button className="get-started-btn" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </main>

      <section className="features">
        <div className="feature">
          <h3>Instant Diagnostics</h3>
          <p>
            Describe your car's symptoms and get potential causes and solutions
            instantly.
          </p>
        </div>
        <div className="feature">
          <h3>Maintenance Reminders</h3>
          <p>
            Get personalized maintenance schedules and reminders for your
            specific vehicle.
          </p>
        </div>
        <div className="feature">
          <h3>DIY Repair Guides</h3>
          <p>
            Step-by-step instructions for common repairs you can do yourself.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; 2023 AutoMate. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
