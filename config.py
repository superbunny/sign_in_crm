import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crm.db')
SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'

# Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL = 'gemini-3-flash-preview'

# Flask
DEBUG = True
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
