import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing, SimpleExpSmoothing
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class ForecastModels:
    def __init__(self):
        self.models = {
            'Media Móvil Simple (SMA)': self.sma_model,
            'Suavizado Exponencial Simple (SES)': self.ses_model,
            'Holt-Winters (Triple Exponencial)': self.holt_winters_model,
            'ARIMA (AutoRegressive Integrated Moving Average)': self.arima_model,
            'Regresión Lineal': self.linear_regression_model,
            'Random Forest': self.random_forest_model
        }
        
        self.model_descriptions = {
            'Media Móvil Simple (SMA)': {
                'equation': 'ŷ_t = (y_{t-1} + y_{t-2} + ... + y_{t-n}) / n',
                'description': 'Promedia los últimos n valores para predecir el siguiente.',
                'best_for': 'Series con tendencia suave y sin estacionalidad fuerte.',
                'limitations': 'No captura tendencias o estacionalidad. Retraso en los puntos de cambio.',
                'parameters': 'n (ventana de promedio)'
            },
            'Suavizado Exponencial Simple (SES)': {
                'equation': 'ŷ_t = α * y_{t-1} + (1-α) * ŷ_{t-1}',
                'description': 'Asigna pesos exponencialmente decrecientes a observaciones pasadas.',
                'best_for': 'Series sin tendencia o estacionalidad clara.',
                'limitations': 'No adecuado para datos con tendencia o estacionalidad.',
                'parameters': 'α (factor de suavizado, 0-1)'
            },
            'Holt-Winters (Triple Exponencial)': {
                'equation': 'Nivel: l_t = α(y_t - s_{t-m}) + (1-α)(l_{t-1} + b_{t-1})\nTendencia: b_t = β(l_t - l_{t-1}) + (1-β)b_{t-1}\nEstacionalidad: s_t = γ(y_t - l_{t-1} - b_{t-1}) + (1-γ)s_{t-m}',
                'description': 'Modela nivel, tendencia y estacionalidad con tres ecuaciones de suavizado.',
                'best_for': 'Series con tendencia y estacionalidad claras.',
                'limitations': 'Sensible a la elección de parámetros. Requiere múltiples ciclos estacionales.',
                'parameters': 'α, β, γ (factores de suavizado), m (períodos estacionales)'
            },
            'ARIMA (AutoRegressive Integrated Moving Average)': {
                'equation': 'y′_t = c + φ₁y′_{t-1} + ... + φₚy′_{t-𝑝} + θ₁ε_{t-1} + ... + θ𝑞ε_{t-𝑞} + ε_t',
                'description': 'Combina componentes autoregresivos (AR), diferenciación (I) y media móvil (MA).',
                'best_for': 'Series estacionarias o que pueden hacerse estacionarias mediante diferenciación.',
                'limitations': 'Complejidad en la selección de parámetros (p,d,q).',
                'parameters': 'p (orden AR), d (grado de diferenciación), q (orden MA)'
            },
            'Regresión Lineal': {
                'equation': 'y = β₀ + β₁x₁ + β₂x₂ + ... + βₚxₚ + ε',
                'description': 'Modela la relación lineal entre variables independientes y la variable dependiente.',
                'best_for': 'Cuando existe una relación lineal clara entre el tiempo y la demanda.',
                'limitations': 'Asume linealidad. No captura relaciones no lineales o estacionalidad compleja.',
                'parameters': 'Coeficientes β para cada variable predictora'
            },
            'Random Forest': {
                'equation': 'ŷ = (1/K) * Σ_{k=1}^K f_k(x)',
                'description': 'Ensemble de árboles de decisión que promedian múltiples predicciones.',
                'best_for': 'Relaciones complejas no lineales entre características y objetivo.',
                'limitations': 'Puede sobreajustar sin tuning adecuado. Menos interpretable.',
                'parameters': 'n_estimators (número de árboles), max_depth (profundidad máxima)'
            }
        }
    
    def calculate_metrics(self, actual, predicted):
        # Filtrar valores NaN
        valid_mask = ~np.isnan(actual) & ~np.isnan(predicted)
        actual_valid = actual[valid_mask]
        predicted_valid = predicted[valid_mask]
        
        if len(actual_valid) == 0:
            return {
                'mae': float('nan'),
                'mse': float('nan'),
                'rmse': float('nan'),
                'mape': float('nan')
            }
        
        mae = mean_absolute_error(actual_valid, predicted_valid)
        mse = mean_squared_error(actual_valid, predicted_valid)
        rmse = np.sqrt(mse)
        
        # MAPE con protección contra divisiones por cero
        with np.errstate(divide='ignore', invalid='ignore'):
            mape = np.mean(np.abs((actual_valid - predicted_valid) / actual_valid)) * 100
            mape = np.nan if np.isinf(mape) else mape
        
        return {
            'mae': round(mae, 2),
            'mse': round(mse, 2),
            'rmse': round(rmse, 2),
            'mape': round(mape, 2) if not np.isnan(mape) else float('nan')
        }
    
    def sma_model(self, data, window=3):
        try:
            predictions = []
            for i in range(len(data)):
                if i < window:
                    predictions.append(np.nan)
                else:
                    predictions.append(np.mean(data[i-window:i]))
            
            # Encontrar el mejor parámetro de ventana (3-12)
            best_mape = float('inf')
            best_window = window
            best_predictions = predictions
            
            for w in range(3, 13):
                preds = []
                for i in range(len(data)):
                    if i < w:
                        preds.append(np.nan)
                    else:
                        preds.append(np.mean(data[i-w:i]))
                
                metrics = self.calculate_metrics(data, np.array(preds))
                if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                    best_mape = metrics['mape']
                    best_window = w
                    best_predictions = preds
            
            metrics = self.calculate_metrics(data, np.array(best_predictions))
            
            return {
                'name': 'Media Móvil Simple (SMA)',
                'predictions': best_predictions,
                'metrics': metrics,
                'parameters': {'window': best_window},
                'description': self.model_descriptions['Media Móvil Simple (SMA)']
            }
        except Exception as e:
            print(f"Error en SMA: {str(e)}")
            return None
    
    def ses_model(self, data):
        try:
            # Probar múltiples valores alpha para encontrar el mejor
            best_alpha = 0.3
            best_mape = float('inf')
            best_predictions = []
            
            for alpha in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
                try:
                    model = SimpleExpSmoothing(data).fit(smoothing_level=alpha, optimized=False)
                    predictions = model.fittedvalues
                    
                    metrics = self.calculate_metrics(data, predictions)
                    if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                        best_mape = metrics['mape']
                        best_alpha = alpha
                        best_predictions = predictions
                except:
                    continue
            
            metrics = self.calculate_metrics(data, best_predictions)
            
            return {
                'name': 'Suavizado Exponencial Simple (SES)',
                'predictions': best_predictions.tolist(),
                'metrics': metrics,
                'parameters': {'alpha': best_alpha},
                'description': self.model_descriptions['Suavizado Exponencial Simple (SES)']
            }
        except Exception as e:
            print(f"Error en SES: {str(e)}")
            return None
    
    def holt_winters_model(self, data, seasonal_periods=12):
        try:
            # Intentar modelos aditivos y multiplicativos
            best_mape = float('inf')
            best_model_type = 'additive'
            best_predictions = []
            
            for seasonal in ['add', 'mul']:
                try:
                    model = ExponentialSmoothing(
                        data, 
                        seasonal=seasonal, 
                        seasonal_periods=seasonal_periods,
                        initialization_method='estimated'
                    )
                    model_fit = model.fit()
                    predictions = model_fit.fittedvalues
                    
                    metrics = self.calculate_metrics(data, predictions)
                    if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                        best_mape = metrics['mape']
                        best_model_type = seasonal
                        best_predictions = predictions
                except:
                    continue
            
            metrics = self.calculate_metrics(data, best_predictions)
            
            return {
                'name': 'Holt-Winters (Triple Exponencial)',
                'predictions': best_predictions.tolist(),
                'metrics': metrics,
                'parameters': {'seasonal': best_model_type, 'seasonal_periods': seasonal_periods},
                'description': self.model_descriptions['Holt-Winters (Triple Exponencial)']
            }
        except Exception as e:
            print(f"Error en Holt-Winters: {str(e)}")
            return None
    
    def arima_model(self, data):
        try:
            # Probar diferentes órdenes de ARIMA
            best_order = (1, 1, 1)
            best_mape = float('inf')
            best_predictions = []
            
            # Probar combinaciones comunes de ARIMA
            orders_to_try = [
                (1, 1, 1), (0, 1, 1), (1, 1, 0), 
                (2, 1, 2), (0, 1, 0), (1, 0, 1)
            ]
            
            for order in orders_to_try:
                try:
                    model = ARIMA(data, order=order)
                    model_fit = model.fit()
                    predictions = model_fit.predict()
                    
                    metrics = self.calculate_metrics(data, predictions)
                    if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                        best_mape = metrics['mape']
                        best_order = order
                        best_predictions = predictions
                except:
                    continue
            
            metrics = self.calculate_metrics(data, best_predictions)
            
            return {
                'name': 'ARIMA (AutoRegressive Integrated Moving Average)',
                'predictions': best_predictions.tolist(),
                'metrics': metrics,
                'parameters': {'order': best_order},
                'description': self.model_descriptions['ARIMA (AutoRegressive Integrated Moving Average)']
            }
        except Exception as e:
            print(f"Error en ARIMA: {str(e)}")
            return None
    
    def linear_regression_model(self, data):
        try:
            X = np.arange(len(data)).reshape(-1, 1)
            y = data
            
            model = LinearRegression()
            model.fit(X, y)
            predictions = model.predict(X)
            
            metrics = self.calculate_metrics(data, predictions)
            
            return {
                'name': 'Regresión Lineal',
                'predictions': predictions.tolist(),
                'metrics': metrics,
                'parameters': {
                    'intercept': round(model.intercept_, 2),
                    'coefficient': round(model.coef_[0], 2)
                },
                'description': self.model_descriptions['Regresión Lineal']
            }
        except Exception as e:
            print(f"Error en Regresión Lineal: {str(e)}")
            return None
    
    def random_forest_model(self, data):
        try:
            X = np.arange(len(data)).reshape(-1, 1)
            y = data
            
            # Crear características adicionales (mes, trimestre, etc.)
            X_enhanced = np.column_stack((
                X.flatten(),
                (X.flatten() % 12) + 1,  # Mes
                ((X.flatten() % 12) // 3) + 1  # Trimestre
            ))
            
            # Probar diferentes configuraciones
            best_mape = float('inf')
            best_predictions = []
            best_params = {}
            
            for n_estimators in [50, 100]:
                for max_depth in [None, 5, 10]:
                    try:
                        model = RandomForestRegressor(
                            n_estimators=n_estimators, 
                            max_depth=max_depth,
                            random_state=42
                        )
                        model.fit(X_enhanced, y)
                        predictions = model.predict(X_enhanced)
                        
                        metrics = self.calculate_metrics(data, predictions)
                        if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                            best_mape = metrics['mape']
                            best_predictions = predictions
                            best_params = {'n_estimators': n_estimators, 'max_depth': max_depth}
                    except:
                        continue
            
            metrics = self.calculate_metrics(data, best_predictions)
            
            return {
                'name': 'Random Forest',
                'predictions': best_predictions.tolist(),
                'metrics': metrics,
                'parameters': best_params,
                'description': self.model_descriptions['Random Forest']
            }
        except Exception as e:
            print(f"Error en Random Forest: {str(e)}")
            return None
    
    def run_all_models(self, data):
        results = []
        for model_name, model_func in self.models.items():
            try:
                print(f"Ejecutando modelo: {model_name}")
                result = model_func(data)
                if result:
                    results.append(result)
                    print(f"Modelo {model_name} completado - MAPE: {result['metrics']['mape']}")
            except Exception as e:
                print(f"Error en modelo {model_name}: {str(e)}")
        
        return results
    
    def generate_forecast(self, model_name, data, periods=12):
        try:
            if model_name == 'Media Móvil Simple (SMA)':
                # Usar ventana óptima encontrada durante el modelado
                window = 3  # Valor por defecto
                last_values = data[-window:]
                forecast = [np.mean(last_values)] * periods
            
            elif model_name == 'Suavizado Exponencial Simple (SES)':
                # Recalcular el mejor alpha
                best_alpha = 0.3
                best_mape = float('inf')
                
                for alpha in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
                    try:
                        model = SimpleExpSmoothing(data).fit(smoothing_level=alpha, optimized=False)
                        predictions = model.fittedvalues
                        metrics = self.calculate_metrics(data, predictions)
                        if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                            best_mape = metrics['mape']
                            best_alpha = alpha
                    except:
                        continue
                
                # Generar pronóstico
                model = SimpleExpSmoothing(data).fit(smoothing_level=best_alpha, optimized=False)
                forecast = model.forecast(periods).tolist()
            
            elif model_name == 'Holt-Winters (Triple Exponencial)':
                # Determinar el mejor tipo de modelo
                best_seasonal = 'add'
                best_mape = float('inf')
                
                for seasonal in ['add', 'mul']:
                    try:
                        model = ExponentialSmoothing(
                            data, 
                            seasonal=seasonal, 
                            seasonal_periods=12,
                            initialization_method='estimated'
                        )
                        model_fit = model.fit()
                        predictions = model_fit.fittedvalues
                        metrics = self.calculate_metrics(data, predictions)
                        if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                            best_mape = metrics['mape']
                            best_seasonal = seasonal
                    except:
                        continue
                
                # Generar pronóstico
                model = ExponentialSmoothing(
                    data, 
                    seasonal=best_seasonal, 
                    seasonal_periods=12,
                    initialization_method='estimated'
                )
                model_fit = model.fit()
                forecast = model_fit.forecast(periods).tolist()
            
            elif model_name == 'ARIMA (AutoRegressive Integrated Moving Average)':
                # Determinar el mejor orden
                best_order = (1, 1, 1)
                best_mape = float('inf')
                
                orders_to_try = [
                    (1, 1, 1), (0, 1, 1), (1, 1, 0), 
                    (2, 1, 2), (0, 1, 0), (1, 0, 1)
                ]
                
                for order in orders_to_try:
                    try:
                        model = ARIMA(data, order=order)
                        model_fit = model.fit()
                        predictions = model_fit.predict()
                        metrics = self.calculate_metrics(data, predictions)
                        if not np.isnan(metrics['mape']) and metrics['mape'] < best_mape:
                            best_mape = metrics['mape']
                            best_order = order
                    except:
                        continue
                
                # Generar pronóstico
                model = ARIMA(data, order=best_order)
                model_fit = model.fit()
                forecast = model_fit.forecast(periods).tolist()
            
            elif model_name == 'Regresión Lineal':
                X = np.arange(len(data)).reshape(-1, 1)
                y = data
                
                model = LinearRegression()
                model.fit(X, y)
                
                # Pronosticar períodos futuros
                X_future = np.arange(len(data), len(data) + periods).reshape(-1, 1)
                forecast = model.predict(X_future).tolist()
            
            elif model_name == 'Random Forest':
                X = np.arange(len(data)).reshape(-1, 1)
                y = data
                
                # Crear características adicionales
                X_enhanced = np.column_stack((
                    X.flatten(),
                    (X.flatten() % 12) + 1,
                    ((X.flatten() % 12) // 3) + 1
                ))
                
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(X_enhanced, y)
                
                # Crear características para períodos futuros
                X_future = np.arange(len(data), len(data) + periods)
                X_future_enhanced = np.column_stack((
                    X_future,
                    (X_future % 12) + 1,
                    ((X_future % 12) // 3) + 1
                ))
                
                forecast = model.predict(X_future_enhanced).tolist()
            
            else:
                # Pronóstico por defecto (promedio)
                forecast = [np.mean(data)] * periods
            
            return {
                'forecast': forecast,
                'model_name': model_name,
                'periods': periods
            }
        
        except Exception as e:
            print(f"Error generando pronóstico para {model_name}: {str(e)}")
            # Pronóstico de respaldo
            return {
                'forecast': [np.mean(data)] * periods,
                'model_name': model_name,
                'periods': periods,
                'error': str(e)
            }