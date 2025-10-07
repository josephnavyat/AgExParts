import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    return <Navigate to="/profile" replace />;
  }
  return children;
}
