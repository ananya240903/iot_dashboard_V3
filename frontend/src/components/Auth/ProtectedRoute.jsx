import React, { useEffect, useState } from 'react';
import TokenError from './TokenError';
import { getAccessToken } from '../../utils/api';

const ProtectedRoute = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      // ------------------------------------------------------------------
      // DEV-ONLY BYPASS
      // Skips both the "do we have a token" redirect and the live
      // validation fetch, so local dev never bounces to CRIS SSO or
      // depends on VITE_TOKEN_VALIDATION_URL being reachable.
      //
      // Guarded the same way as the backend/api.js bypasses: only ever
      // active when you've explicitly set VITE_BYPASS_AUTH=true in your
      // local .env. Never set this in a shared/staging/production env.
      // ------------------------------------------------------------------
      if (import.meta.env.VITE_BYPASS_AUTH === 'true') {
        console.warn('[ProtectedRoute] VITE_BYPASS_AUTH is active — skipping token validation.');
        setIsAuthenticated(true);
        setIsValidating(false);
        return;
      }

      const accessToken = getAccessToken();

      if (!accessToken) {
        window.location.href = 'https://roams.cris.org.in/roamsapp/#/login';
        return;
      }

      try {
        const response = await fetch(import.meta.env.VITE_TOKEN_VALIDATION_URL, {
          method: 'GET',
          headers: {
            'X-Auth-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

  useEffect(() => {
    const handleTokenExpired = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener('token-expired', handleTokenExpired);
    return () => {
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, []);

  if (isValidating) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Authenticating...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <TokenError />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
