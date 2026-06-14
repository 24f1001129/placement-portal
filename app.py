from werkzeug.security import generate_password_hash
from flask import Flask, jsonify
from backend.config import Config
from backend.models import User
from backend.models.database import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from backend.routes import auth_bp, admin_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    with app.app_context():
        
        db.create_all()
        if not User.query.filter_by(role='ADMIN').first():
            admin = User(
                email='admin@institute.com',
                password_hash=generate_password_hash('admin'),
                role='ADMIN'
            )
            db.session.add(admin)
            db.session.commit()

    return app

app = create_app()
app.run(debug=True, port=5000, host='0.0.0.0')
