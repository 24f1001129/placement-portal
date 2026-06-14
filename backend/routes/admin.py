from flask import Blueprint, jsonify
from backend.models import User

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
def index():
    return jsonify({'message': 'Admin dashboard'}), 200