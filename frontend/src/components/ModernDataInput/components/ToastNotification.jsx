import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';

/**
 * ToastNotification component for showing temporary feedback messages
 * Implements toast notifications for file processing feedback
 * Requirements: 3.5, 4.4
 */
export default function ToastNotification({
  open = false,
  message = '',
  severity = 'info',
  title = '',
  duration = 6000,
  onClose,
  action = null
}) {
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }} // Account for header height
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%', minWidth: 300 }}
        action={
          action || (
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  );
}