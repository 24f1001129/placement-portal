from app import app
from backend.extensions import mail
from backend.celery_app import celery_init_app
import backend.tasks  # to register the tasks

celery = app.extensions["celery"]
