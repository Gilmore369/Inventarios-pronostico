import React from 'react';

function TestApp() {
  console.log('TestApp está renderizando...');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>🚀 Aplicación de Pronósticos - Test</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        Si puedes ver esto, React está funcionando correctamente!
      </p>
      <button 
        onClick={() => alert('¡React funciona!')}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Hacer clic para probar
      </button>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '5px' }}>
        <h3>Estado del Sistema:</h3>
        <ul>
          <li>✅ React está funcionando</li>
          <li>✅ JavaScript está activo</li>
          <li>✅ Estilos se aplican correctamente</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;