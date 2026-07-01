from celery import Celery, Task
from flask import Flask

def celery_init_app(app: Flask) -> Celery:
    class FlaskTask(Task):
        def __call__(self, *args: object, **kwargs: object) -> object:
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object(app.config["CELERY"])
    celery_app.set_default()
    app.extensions["celery"] = celery_app
    
    from celery.schedules import crontab
    
    celery_app.conf.beat_schedule = {
        'daily-interview-reminders': {
            'task': 'backend.tasks.send_daily_interview_reminders',
            'schedule': crontab(hour=8, minute=0),
        },
        'hourly-interview-reminders': {
            'task': 'backend.tasks.send_hourly_interview_reminders',
            'schedule': crontab(minute=0),
        },
        'monthly-placement-reports': {
            'task': 'backend.tasks.generate_monthly_company_reports',
            'schedule': crontab(day_of_month='1', hour=0, minute=0),
        },
    }
    celery_app.conf.timezone = 'Asia/Kolkata'

    return celery_app
