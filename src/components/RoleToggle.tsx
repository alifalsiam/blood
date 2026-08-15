import React from 'react';
import { useAuth } from '../context/AuthContext';

interface RoleToggleProps {
  className?: string;
  compact?: boolean;
}

export const RoleToggle: React.FC<RoleToggleProps> = ({ className = '', compact = false }) => {
  const { activeRole, promptRoleShift } = useAuth();

  const currentRole = activeRole === 'Donor' ? 'donor' : 'receiver';

  const handleSetRole = (role: 'Donor' | 'Receiver') => {
    if (activeRole !== role) {
      promptRoleShift(role);
    }
  };

  return (
    <div
      className={`role-toggle-container ${compact ? 'compact' : ''} ${className}`}
      id="roleToggle"
      data-state={currentRole}
      role="radiogroup"
      aria-label="Role Selection"
    >
      <div className="toggle-pill" aria-hidden="true" />

      <button
        type="button"
        className={`role-btn ${activeRole === 'Donor' ? 'active' : ''}`}
        id="btnDonor"
        role="radio"
        aria-checked={activeRole === 'Donor'}
        onClick={() => handleSetRole('Donor')}
      >
        <span>❤️</span>
        <span>Donor</span>
      </button>

      <button
        type="button"
        className={`role-btn ${activeRole === 'Receiver' ? 'active' : ''}`}
        id="btnReceiver"
        role="radio"
        aria-checked={activeRole === 'Receiver'}
        onClick={() => handleSetRole('Receiver')}
      >
        <span>🤲</span>
        <span>Receiver</span>
      </button>
    </div>
  );
};
