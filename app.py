from werkzeug.security import generate_password_hash
from flask import Flask, jsonify
from backend.config import Config
from backend.models import User
from backend.models.database import db
from backend.extensions import mail, cache
from backend.celery_app import celery_init_app

def create_app():
    app = Flask(__name__, static_folder='frontend', static_url_path='')
    app.config.from_object(Config)
    
    # Configure Celery dict mapping from config
    app.config.from_mapping(
        CELERY=dict(
            broker_url=app.config.get('CELERY_BROKER_URL'),
            result_backend=app.config.get('CELERY_RESULT_BACKEND'),
            task_ignore_result=False,
        ),
    )
    
    db.init_app(app)
    mail.init_app(app)
    cache.init_app(app)
    celery_app = celery_init_app(app)

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
            admin = User()
            admin.email = 'admin@institute.com'
            admin.password_hash = generate_password_hash('admin')
            admin.role = 'ADMIN'
            db.session.add(admin)
            db.session.commit()

    return app

app = create_app()
app.run(port=5000, host='0.0.0.0', debug=True)
