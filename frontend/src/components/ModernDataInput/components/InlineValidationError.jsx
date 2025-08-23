import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Fade
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

/**
 * InlineValidationError component for showing validation errors inline with form fields
 * Implements inline validation errors for table cells
 * Requirements: 3.5, 4.4
 */
export default function InlineValidationError({
  error = null,
  children,
  showIcon = true,
  placement = 'bottom-start'
}) {
  if (!error) {
    return children;
  }

  const isError = error.severity === 'error';
  const isWarning = error.severity === 'warning';

  const getIcon = () => {
    if (isError) return <ErrorIcon fontSize="small" />;
    if (isWarning) return <WarningIcon fontSize="small" />;
    return null;
  };

  const getColor = () => {
    if (isError) return '#f44336';
    if (isWarning) return '#ff9800';
    return '#2196f3';
  };

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {isError ? 'Error' : isWarning ? 'Advertencia' : 'Información'}
          </Typography>
          <Typography variant="body2">
            {error.message}
          </Typography>
        </Box>
      }
      placement={placement}
      arrow
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          width: '100%'
        }}
      >
        {children}
        
        {/* Error indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: -2,
            right: -2,
            color: getColor(),
            display: showIcon ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            zIndex: 1
          }}
        >
          {getIcon()}
        </Box>
        
        {/* Error border */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `2px solid ${getColor()}`,
            borderRadius: 1,
            pointerEvents: 'none',
            opacity: 0.7
          }}
        />
      </Box>
    </Tooltip>
  );
}