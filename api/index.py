import sys
import os

# Agregar el directorio backend al path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

# Importar la aplicación Flask
from app import app

# Exportar la aplicación para Vercel
application = app

if __name__ == "__main__":
    app.run()