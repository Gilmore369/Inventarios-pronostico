from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import joblib
from datetime import datetime
import threading
from models import ForecastModels

app = Flask(__name__)
CORS(app)

# Almacenamiento en memoria (en producción usar Redis)
results_cache = {}
forecast_models = ForecastModels()

@app.route('/api/upload', methods=['POST'])
def upload_data():
    try:
        if 'file' in request.files:
            file = request.files['file']
            df = pd.read_csv(file)
        else:
            data = request.json
            df = pd.DataFrame(data)
        
        # Validaciones
        if len(df) < 12 or len(df) > 120:
            return jsonify({'error': 'Se requieren entre 12 y 120 meses de datos'}), 400
        
        if 'demand' not in df.columns:
            return jsonify({'error': 'El dataset debe contener una columna "demand"'}), 400
        
        # Almacenar datos en caché
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_cache[session_id] = {
            'data': df.to_dict(),
            'status': 'uploaded',
            'results': None
        }
        
        return jsonify({'session_id': session_id, 'message': 'Datos cargados exitosamente'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_models():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if session_id not in results_cache:
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        # Ejecutar en segundo plano
        thread = threading.Thread(target=run_forecast_models, args=(session_id,))
        thread.start()
        
        return jsonify({'message': 'Procesamiento iniciado', 'session_id': session_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def run_forecast_models(session_id):
    try:
        data = results_cache[session_id]['data']
        df = pd.DataFrame(data)
        
        # Ejecutar todos los modelos
        results = forecast_models.run_all_models(df['demand'].values)
        
        # Ordenar por error (MAPE)
        sorted_results = sorted(results, key=lambda x: x['metrics']['mape'])
        
        # Actualizar caché
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = sorted_results
        
    except Exception as e:
        results_cache[session_id]['status'] = 'error'
        results_cache[session_id]['error'] = str(e)

@app.route('/api/results', methods=['GET'])
def get_results():
    try:
        session_id = request.args.get('session_id')
        
        if session_id not in results_cache:
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        if results_cache[session_id]['status'] == 'processing':
            return jsonify({'status': 'processing'})
        
        if results_cache[session_id]['status'] == 'error':
            return jsonify({'status': 'error', 'error': results_cache[session_id]['error']})
        
        # Devolver top 10 resultados
        results = results_cache[session_id]['results'][:10]
        return jsonify({'status': 'completed', 'results': results})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast', methods=['POST'])
def generate_forecast():
    try:
        data = request.json
        session_id = data.get('session_id')
        model_name = data.get('model_name')
        periods = data.get('periods', 12)
        
        if session_id not in results_cache:
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        # Recuperar datos
        df = pd.DataFrame(results_cache[session_id]['data'])
        demand_data = df['demand'].values
        
        # Generar pronóstico
        forecast = forecast_models.generate_forecast(model_name, demand_data, periods)
        
        # Añadir información del modelo
        model_info = forecast_models.model_descriptions.get(model_name, {})
        forecast['model_info'] = model_info
        
        return jsonify(forecast)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500