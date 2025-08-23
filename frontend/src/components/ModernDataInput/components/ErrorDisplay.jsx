import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

/**
 * ErrorDisplay component for showing validation and processing errors
 * Implements MUI Alert components for different error types
 * Requirements: 3.5, 4.4
 */
export default function ErrorDisplay({ 
  errors = [], 
  title = "Errores de Validación",
  collapsible = false,
  defaultExpanded = true 
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  // Group errors by severity
  const errorsBySeverity = React.useMemo(() => {
    return errors.reduce((acc, error) => {
      const severity = error.severity || 'error';
      if (!acc[severity]) {
        acc[severity] = [];
      }
      acc[severity].push(error);
      return acc;
    }, {});
  }, [errors]);

  // Get icon for severity
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  // Get color for severity
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  };

  // Format error message with row information
  const formatErrorMessage = (error) => {
    let message = error.message;
    
    if (error.row !== undefined && error.row !== -1) {
      message = `Fila ${error.row + 1}: ${message}`;
    }
    
    if (error.field && error.field !== 'general') {
      message = `${message} (Campo: ${error.field})`;
    }
    
    return message;
  };

  if (errors.length === 0) {
    return null;
  }

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {Object.entries(errorsBySeverity).map(([severity, severityErrors]) => (
        <Alert 
          key={severity}
          severity={getSeverityColor(severity)}
          sx={{ mb: 1 }}
          action={
            collapsible && (
              <IconButton
                aria-label="toggle error details"
                color="inherit"
                size="small"
                onClick={handleToggleExpanded}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )
          }
        >
          <AlertTitle>
            {title} - {severityErrors.length} {severity === 'error' ? 'error' : severity}{severityErrors.length !== 1 ? 'es' : ''}
          </AlertTitle>
          
          <Collapse in={!collapsible || expanded}>
            {severityErrors.length === 1 ? (
              <Typography variant="body2">
                {formatErrorMessage(severityErrors[0])}
              </Typography>
            ) : (
              <List dense sx={{ pt: 0 }}>
                {severityErrors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getSeverityIcon(severity)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={formatErrorMessage(error)}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Collapse>
        </Alert>
      ))}
    </Box>
  );
}