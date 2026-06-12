import React from 'react';

const overdeskLogoUrl = 'https://raw.githubusercontent.com/Bl3551nq/Overdesk-Logos/refs/heads/main/overdesk.svg';

interface OverdeskLogoProps {
  className?: string;
  size?: number;
}

export const OverdeskLogo: React.FC<OverdeskLogoProps> = ({ className = '', size = 48 }) => {
  return (
    <img
      src={overdeskLogoUrl}
      width={size}
      height={size}
      className={className}
      id="overdesk-logo"
      alt="Overdesk"
      referrerPolicy="no-referrer"
    />
  );
};
