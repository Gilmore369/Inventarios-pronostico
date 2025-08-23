from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
from datetime import datetime
import sys
import os

# Agregar el directorio backend al path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

app = Flask(__name__)
CORS(app)

# Almacenamiento en memoria simple
results_cache = {}

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/upload', methods=['POST'])
def upload_data():
    try:
        if 'file' in request.files:
            file = request.files['file']
            df = pd.read_csv(file)
        else:
            data = request.json
            df = pd.DataFrame(data)
        
        # Validaciones básicas
        if len(df) < 12 or len(df) > 120:
            return jsonify({'error': 'Se requieren entre 12 y 120 meses de datos'}), 400
        
        if 'demand' not in df.columns:
            return jsonify({'error': 'La columna "demand" es requerida'}), 400
        
        # Generar session_id
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Guardar datos en cache
        results_cache[session_id] = {
            'data': df.to_dict('records'),
            'status': 'uploaded',
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify({
            'message': 'Datos cargados exitosamente',
            'session_id': session_id,
            'rows': len(df)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_data():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id or session_id not in results_cache:
            return jsonify({'error': 'Session ID inválido'}), 400
        
        # Simular procesamiento (versión simplificada)
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = [
            {'name': 'Simple Moving Average', 'mape': 15.2, 'mae': 12.5, 'mse': 180.3, 'rmse': 13.4},
            {'name': 'Linear Regression', 'mape': 18.7, 'mae': 15.2, 'mse': 220.1, 'rmse': 14.8},
            {'name': 'Random Forest', 'mape': 22.1, 'mae': 18.9, 'mse': 280.5, 'rmse': 16.7}
        ]
        
        return jsonify({'message': 'Procesamiento iniciado'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/results', methods=['GET'])
def get_results():
    try:
        session_id = request.args.get('session_id')
        
        if not session_id or session_id not in results_cache:
            return jsonify({'error': 'Session ID inválido'}), 400
        
        session_data = results_cache[session_id]
        
        return jsonify({
            'status': session_data['status'],
            'results': session_data.get('results', [])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast', methods=['POST'])
def generate_forecast():
    try:
        data = request.json
        session_id = data.get('session_id')
        periods = data.get('periods', 12)
        
        if not session_id or session_id not in results_cache:
            return jsonify({'error': 'Session ID inválido'}), 400
        
        # Generar pronóstico simple
        base_value = 100
        forecast = []
        for i in range(periods):
            value = base_value + (i * 2) + np.random.normal(0, 5)
            forecast.append({
                'period': i + 1,
                'forecast': round(value, 2),
                'lower_bound': round(value - 10, 2),
                'upper_bound': round(value + 10, 2)
            })
        
        return jsonify({
            'forecast': forecast,
            'model': data.get('model', 'Simple Moving Average'),
            'periods': periods
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Exportar la aplicación para Vercel
application = app

if __name__ == "__main__":
    app.run(debug=True)