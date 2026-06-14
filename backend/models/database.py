from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Initialize SQLAlchemy with no settings
db = SQLAlchemy()

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Enforce foreign key constraints in SQLite
    SQLite disables ON DELETE CASCADE on default
    This code enables ON DELETE CASCADE in SQLite
    Records with relationships get deleted when the parent record is deleted
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()