import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface RequireRoleProps {
  role: UserRole;
  children: React.ReactNode;
}

/**
 * Renders children only for the given role; other roles are sent to
 * their own dashboard. Unauthenticated access is already handled by
 * DashboardLayout.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { user } = useAuth();

  if (user && user.role !== role) {
    return (
      <Navigate
        to={user.role === 'entrepreneur' ? '/dashboard/entrepreneur' : '/dashboard/investor'}
        replace
      />
    );
  }

  return <>{children}</>;
};
