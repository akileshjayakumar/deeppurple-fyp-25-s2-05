"""
API Router Module

This module provides access to all API routers in the DeepPurple application.
"""

from api.auth import router as auth
from api.users import router as users
from api.sessions import router as sessions
from api.files import router as files
from api.text_analysis_api import router as analysis
from api.admin import router as admin
