import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import Login from './Login';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

function LandingPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
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
      // Clear any local car data
      localStorage.removeItem('lastSelectedCar');
      localStorage.removeItem('tempCarInfo');
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Home confirmation logic
  const handleHomeClick = (e) => {
    e.preventDefault();
    setShowHomeConfirm(true);
  };
  
  const handleHomeConfirm = () => {
    setShowHomeConfirm(false);
    window.location.href = '/';
  };
  
  const handleHomeCancel = () => {
    setShowHomeConfirm(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="landing-page">
      <div className="header-container">
        <div className="header-right" style={{ right: '10px' }}>
          {!user ? (
            <Login />
          ) : (
            <div className="user-profile-container">
              <div className="user-profile-mini" onClick={toggleUserMenu}>
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata.full_name || user.email} 
                    className="user-avatar-mini" 
                  />
                ) : (
                  <div className="user-initial">
                    {(user.user_metadata?.full_name || user.email || '').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="user-name-mini">{user.user_metadata?.full_name || user.email}</span>
              </div>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <p className="user-name">{user.user_metadata?.full_name || user.email}</p>
                    <p className="user-email">{user.email}</p>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="sign-out-button" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="landing-content">
        <img src={require('./automateiconnew.png')} alt="AutoMate Icon" className="automate-landing-icon" />
        <h1>Welcome to AutoMate</h1>
        <p>Your personal automotive diagnostic assistant.</p>
        <button onClick={() => window.location.href = '/chat'} className="get-started-btn">Get Started</button>
      </div>

      {showHomeConfirm && (
        <div className="restart-confirm-modal">
          <div className="restart-confirm-box">
            <p>Are you sure you want to go back to the home page?</p>
            <div className="restart-confirm-buttons">
              <button
                type="button"
                onClick={handleHomeCancel}
                className="restart-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHomeConfirm}
                className="restart-confirm-btn"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
