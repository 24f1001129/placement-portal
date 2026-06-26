from werkzeug.security import generate_password_hash
from flask import Flask, jsonify
from backend.config import Config
from backend.models import User
from backend.models.database import db

def create_app(config_override=None):
    app = Flask(__name__, static_folder='frontend', static_url_path='')
    app.config.from_object(Config)
    if config_override:
        app.config.update(config_override)

    db.init_app(app)

    @app.route('/')
    def index():
        return app.send_static_file('index.html')


    from backend.routes import auth_bp, admin_bp, company_bp, student_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(student_bp)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
