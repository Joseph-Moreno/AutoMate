import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import './CarSelection.css';

// Maximum number of cars a user can have
const MAX_CARS_PER_USER = 5;

const CarSelection = ({ userId, onCarSelect, onAddNewCar }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchUserCars = async () => {
      if (!userId) {
        console.error("No user ID provided to CarSelection component");
        setError("User ID is missing. Please sign in again.");
        setLoading(false);
        return;
      }

      console.log("Fetching cars for user ID:", userId);
      try {
        const { data, error } = await supabase
          .from('cars')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching cars:', error);
          setError(`Failed to fetch your vehicles: ${error.message}`);
          return;
        }

        console.log("Cars fetched from database:", data);
        setCars(data || []);
      } catch (error) {
        console.error('Failed to fetch cars:', error);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserCars();
  }, [userId, supabase]);

  const handleDelete = async (carId) => {
    try {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', carId)
        .eq('user_id', userId); // Extra safety to ensure user only deletes their own cars
      
      if (error) {
        console.error('Error deleting car:', error);
        return;
      }
      
      // Update local state to remove the deleted car
      setCars(cars.filter(car => car.id !== carId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete car:', error);
    }
  };

  // Function to start delete confirmation
  const confirmDelete = (e, carId) => {
    e.stopPropagation(); // Prevent triggering the car selection
    setDeleteConfirm(carId);
  };

  // Function to cancel deletion
  const cancelDelete = (e) => {
    e.stopPropagation(); // Prevent triggering the car selection
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="car-selection-container loading-container">
        <div className="car-selection-loading">
          <div className="loading-spinner"></div>
          <p>Loading your vehicles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="car-selection-container error-container">
        <div className="car-selection-error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const atCarLimit = cars.length >= MAX_CARS_PER_USER;

  return (
    <div className="car-selection-container">
      <h2>Select a Vehicle</h2>
      
      {cars.length === 0 ? (
        <div className="no-cars-message">
          <p>You don't have any saved vehicles yet.</p>
          <button className="add-car-btn" onClick={onAddNewCar}>
            Add Your First Vehicle
          </button>
        </div>
      ) : (
        <>
          <div className="car-list">
            {cars.map((car) => (
              <div 
                key={car.id} 
                className="car-item"
                onClick={() => onCarSelect(car)}
              >
                <div className="car-icon">🚗</div>
                <div className="car-details">
                  <h3>{car.year} {car.make} {car.model}</h3>
                  {car.nickname && <p className="car-nickname">{car.nickname}</p>}
                </div>
                {deleteConfirm === car.id ? (
                  <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
                    <span>Delete?</span>
                    <button 
                      className="confirm-yes" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(car.id);
                      }}
                    >
                      Yes
                    </button>
                    <button 
                      className="confirm-no" 
                      onClick={cancelDelete}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button 
                    className="delete-car-btn" 
                    onClick={(e) => confirmDelete(e, car.id)}
                    title="Delete this vehicle"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="car-selection-actions">
            {atCarLimit ? (
              <div className="car-limit-message">
                <p>You've reached the maximum of {MAX_CARS_PER_USER} vehicles.</p>
                <p>Please delete a vehicle before adding a new one.</p>
              </div>
            ) : (
              <button className="add-car-btn" onClick={onAddNewCar}>
                Add New Vehicle
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CarSelection; 