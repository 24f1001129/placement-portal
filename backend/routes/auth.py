from flask import Blueprint, jsonify
from backend.models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/')
def index():
    return jsonify({'message': 'Authentication'}), 200