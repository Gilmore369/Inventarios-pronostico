import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

const Header = ({ darkMode, toggleDarkMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <AnalyticsIcon sx={{ mr: 2 }} />
        <Typography
          variant={isMobile ? "h6" : "h5"}
          component="div"
          sx={{ 
            flexGrow: 1,
            fontSize: {
              xs: '1.1rem',
              sm: '1.25rem',
              md: '1.5rem'
            }
          }}
        >
          {isMobile ? "Pronósticos" : "Sistema de Pronósticos de Demanda"}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            data-testid="theme-toggle"
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;