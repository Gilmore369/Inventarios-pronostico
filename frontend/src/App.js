import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Header from './components/Header';
import DataInputSimple from './components/DataInputSimple';
import ResultsTableSimple from './components/ResultsTableSimple';
import ForecastSimple from './components/ForecastSimple';
import './App.css';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('upload');
  const [sessionId, setSessionId] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  console.log('App rendered with currentView:', currentView);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleDataUpload = (sessionId) => {
    setSessionId(sessionId);
    setCurrentView('processing');
    processModels(sessionId);
  };

  const processModels = async (sessionId) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      const data = await response.json();
      
      if (data.message === 'Procesamiento iniciado') {
        // Poll for results
        checkResults(sessionId);
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const checkResults = async (sessionId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/results?session_id=${sessionId}`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        setResults(data.results);
        setCurrentView('results');
        setLoading(false);
      } else if (data.status === 'processing') {
        // Check again after 2 seconds
        setTimeout(() => checkResults(sessionId), 2000);
      } else if (data.status === 'error') {
        console.error('Error:', data.error);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleModelSelect = (modelName) => {
    setCurrentView('forecast');
    // Aquí se cargarían los detalles del modelo seleccionado
  };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {currentView === 'upload' && <DataInputSimple onDataUpload={handleDataUpload} />}
        {currentView === 'processing' && (
          <div className="loading">
            <h2>Procesando modelos...</h2>
            <p>Esto puede tomar varios minutos. Se están evaluando 60 modelos de pronóstico.</p>
            {loading && <div className="spinner"></div>}
          </div>
        )}
        {currentView === 'results' && (
          <ResultsTableSimple results={results} onModelSelect={handleModelSelect} />
        )}
        {currentView === 'forecast' && (
          <ForecastSimple sessionId={sessionId} results={results} />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;