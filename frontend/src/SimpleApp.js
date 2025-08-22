import React, { useState } from 'react';

// Aplicación completamente simple sin dependencias externas
function SimpleApp() {
  const [data, setData] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('input');

  const sampleData = `[
  {"month": "2023-01", "demand": 100},
  {"month": "2023-02", "demand": 120},
  {"month": "2023-03", "demand": 95},
  {"month": "2023-04", "demand": 110},
  {"month": "2023-05", "demand": 130},
  {"month": "2023-06", "demand": 125},
  {"month": "2023-07", "demand": 140},
  {"month": "2023-08", "demand": 135},
  {"month": "2023-09", "demand": 115},
  {"month": "2023-10", "demand": 105},
  {"month": "2023-11", "demand": 125},
  {"month": "2023-12", "demand": 150}
]`;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const parsedData = JSON.parse(data || sampleData);
      
      // Enviar datos al backend
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (uploadResponse.ok) {
        // Procesar modelos
        const processResponse = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: uploadResult.session_id })
        });
        
        if (processResponse.ok) {
          // Esperar y obtener resultados
          setTimeout(async () => {
            const resultsResponse = await fetch(`/api/results?session_id=${uploadResult.session_id}`);
            const resultsData = await resultsResponse.json();
            
            if (resultsData.status === 'completed') {
              setResults(resultsData.results);
              setView('results');
            }
            setLoading(false);
          }, 3000);
        }
      }
    } catch (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      backgroundColor: '#1976d2',
      color: 'white',
      padding: '20px',
      textAlign: 'center',
      marginBottom: '20px'
    },
    card: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    textarea: {
      width: '100%',
      height: '300px',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'monospace'
    },
    button: {
      backgroundColor: '#1976d2',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      marginTop: '10px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px'
    },
    th: {
      backgroundColor: '#f5f5f5',
      padding: '12px',
      textAlign: 'left',
      borderBottom: '2px solid #ddd'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #ddd'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>📊 Sistema de Pronósticos de Inventarios</h1>
        <p>Aplicación Simple - 6 Modelos de IA</p>
      </div>

      {view === 'input' && (
        <div style={styles.card}>
          <h2>📈 Cargar Datos de Demanda</h2>
          <p>Ingresa los datos en formato JSON (mínimo 12 meses):</p>
          
          <textarea
            style={styles.textarea}
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder={sampleData}
          />
          
          <br />
          <button 
            style={styles.button}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '🔄 Procesando...' : '🚀 Procesar Datos'}
          </button>
          
          {loading && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p>⏳ Procesando 6 modelos de IA...</p>
              <p>Esto puede tomar 1-2 minutos</p>
            </div>
          )}
        </div>
      )}

      {view === 'results' && results && (
        <div style={styles.card}>
          <h2>📊 Resultados de Modelos</h2>
          <p>Modelos ordenados por precisión (menor MAPE = mejor):</p>
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ranking</th>
                <th style={styles.th}>Modelo</th>
                <th style={styles.th}>MAPE (%)</th>
                <th style={styles.th}>MAE</th>
                <th style={styles.th}>RMSE</th>
              </tr>
            </thead>
            <tbody>
              {results.map((model, index) => (
                <tr key={index}>
                  <td style={styles.td}>#{index + 1}</td>
                  <td style={styles.td}><strong>{model.name}</strong></td>
                  <td style={styles.td}>{model.metrics?.mape?.toFixed(2) || 'N/A'}%</td>
                  <td style={styles.td}>{model.metrics?.mae?.toFixed(2) || 'N/A'}</td>
                  <td style={styles.td}>{model.metrics?.rmse?.toFixed(2) || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button 
            style={styles.button}
            onClick={() => setView('input')}
          >
            🔄 Probar con Otros Datos
          </button>
        </div>
      )}

      <div style={styles.card}>
        <h3>💡 Información del Sistema</h3>
        <ul>
          <li><strong>Backend:</strong> http://localhost:5000</li>
          <li><strong>Modelos disponibles:</strong> SMA, SES, Holt-Winters, ARIMA, Regresión Lineal, Random Forest</li>
          <li><strong>Estado:</strong> {loading ? '🔄 Procesando' : '✅ Listo'}</li>
        </ul>
      </div>
    </div>
  );
}

export default SimpleApp;