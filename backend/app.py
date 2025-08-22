from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import joblib
from datetime import datetime
import threading
import logging
import sys
from models import ForecastModels

app = Flask(__name__)
CORS(app)

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Almacenamiento en memoria (en producción usar Redis)
results_cache = {}
forecast_models = ForecastModels()

@app.route('/api/upload', methods=['POST'])
def upload_data():
    try:
        logger.info("Iniciando carga de datos")
        
        if 'file' in request.files:
            file = request.files['file']
            logger.info(f"Procesando archivo CSV: {file.filename}")
            df = pd.read_csv(file)
        else:
            data = request.json
            logger.info("Procesando datos JSON manuales")
            df = pd.DataFrame(data)
        
        # Validaciones
        if len(df) < 12 or len(df) > 120:
            error_msg = 'Se requieren entre 12 y 120 meses de datos'
            logger.warning(f"Validación fallida: {error_msg}. Datos recibidos: {len(df)} filas")
            return jsonify({'error': error_msg}), 400
        
        if 'demand' not in df.columns:
            error_msg = 'El dataset debe contener una columna "demand"'
            logger.warning(f"Validación fallida: {error_msg}. Columnas encontradas: {list(df.columns)}")
            return jsonify({'error': error_msg}), 400
        
        # Almacenar datos en caché
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        results_cache[session_id] = {
            'data': df.to_dict(),
            'status': 'uploaded',
            'results': None
        }
        
        logger.info(f"Datos cargados exitosamente. Session ID: {session_id}")
        return jsonify({'session_id': session_id, 'message': 'Datos cargados exitosamente'})
    
    except Exception as e:
        logger.error(f"Error en /api/upload: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_models():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        logger.info(f"Iniciando procesamiento para session_id: {session_id}")
        
        if session_id not in results_cache:
            logger.warning(f"Sesión no encontrada: {session_id}")
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        # Marcar como procesando
        results_cache[session_id]['status'] = 'processing'
        
        # Ejecutar en segundo plano
        thread = threading.Thread(target=run_forecast_models, args=(session_id,))
        thread.start()
        
        logger.info(f"Procesamiento iniciado en background para session_id: {session_id}")
        return jsonify({'message': 'Procesamiento iniciado', 'session_id': session_id})
    
    except Exception as e:
        logger.error(f"Error en /api/process: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def run_forecast_models(session_id):
    try:
        logger.info(f"Ejecutando modelos de pronóstico para session_id: {session_id}")
        data = results_cache[session_id]['data']
        df = pd.DataFrame(data)
        
        # Ejecutar todos los modelos
        results = forecast_models.run_all_models(df['demand'].values)
        
        # Ordenar por error (MAPE)
        sorted_results = sorted(results, key=lambda x: x['metrics']['mape'])
        
        # Actualizar caché
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = sorted_results
        
        logger.info(f"Modelos ejecutados exitosamente para session_id: {session_id}. Mejor modelo: {sorted_results[0]['model_name']} (MAPE: {sorted_results[0]['metrics']['mape']:.4f})")
        
    except Exception as e:
        logger.error(f"Error ejecutando modelos para session_id {session_id}: {str(e)}", exc_info=True)
        results_cache[session_id]['status'] = 'error'
        results_cache[session_id]['error'] = str(e)

@app.route('/api/results', methods=['GET'])
def get_results():
    try:
        session_id = request.args.get('session_id')
        
        logger.info(f"Solicitando resultados para session_id: {session_id}")
        
        if session_id not in results_cache:
            logger.warning(f"Sesión no encontrada en /api/results: {session_id}")
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        status = results_cache[session_id]['status']
        
        if status == 'processing':
            logger.info(f"Procesamiento en curso para session_id: {session_id}")
            return jsonify({'status': 'processing'})
        
        if status == 'error':
            error_msg = results_cache[session_id]['error']
            logger.error(f"Error en procesamiento para session_id {session_id}: {error_msg}")
            return jsonify({'status': 'error', 'error': error_msg})
        
        # Devolver top 10 resultados
        results = results_cache[session_id]['results'][:10]
        logger.info(f"Devolviendo {len(results)} resultados para session_id: {session_id}")
        return jsonify({'status': 'completed', 'results': results})
    
    except Exception as e:
        logger.error(f"Error en /api/results: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast', methods=['POST'])
def generate_forecast():
    try:
        data = request.json
        session_id = data.get('session_id')
        model_name = data.get('model_name')
        periods = data.get('periods', 12)
        
        logger.info(f"Generando pronóstico para session_id: {session_id}, modelo: {model_name}, períodos: {periods}")
        
        if session_id not in results_cache:
            logger.warning(f"Sesión no encontrada en /api/forecast: {session_id}")
            return jsonify({'error': 'Sesión no encontrada'}), 404
        
        # Recuperar datos
        df = pd.DataFrame(results_cache[session_id]['data'])
        demand_data = df['demand'].values
        
        # Generar pronóstico
        forecast = forecast_models.generate_forecast(model_name, demand_data, periods)
        
        # Añadir información del modelo
        model_info = forecast_models.model_descriptions.get(model_name, {})
        forecast['model_info'] = model_info
        
        logger.info(f"Pronóstico generado exitosamente para session_id: {session_id}, modelo: {model_name}")
        return jsonify(forecast)
    
    except Exception as e:
        logger.error(f"Error en /api/forecast: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Backend funcionando correctamente',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'API de Pronósticos de Inventarios',
        'version': '1.0.0',
        'endpoints': [
            '/api/health',
            '/api/upload',
            '/api/process',
            '/api/results',
            '/api/forecast'
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)