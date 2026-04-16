import React, { createContext, useContext, useState, useCallback } from 'react';

const ProfileModalContext = createContext();

export const useProfileModal = () => useContext(ProfileModalContext);

export const ProfileModalProvider = ({ children }) => {
  const [profileUserId, setProfileUserId] = useState(null);

  const openProfile = useCallback((userId) => {
    setProfileUserId(userId);
  }, []);

  const closeProfile = useCallback(() => {
    setProfileUserId(null);
  }, []);

  return (
    <ProfileModalContext.Provider value={{ profileUserId, openProfile, closeProfile }}>
      {children}
    </ProfileModalContext.Provider>
  );
};
