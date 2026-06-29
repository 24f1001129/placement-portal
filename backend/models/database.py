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

def format_indian_currency(amount):
    """
    Formats a number to Indian numbering system (lakhs/crores).
    E.g., 1200000 -> 12,00,000
    50000 -> 50,000
    15000000 -> 1,50,00,000
    """
    if amount is None:
        return ""
    try:
        s = str(int(amount))
    except (ValueError, TypeError):
        return str(amount)
    if len(s) <= 3:
        return s
    last_three = s[-3:]
    remaining = s[:-3]
    chunks = []
    while len(remaining) > 2:
        chunks.append(remaining[-2:])
        remaining = remaining[:-2]
    if remaining:
        chunks.append(remaining)
    chunks.reverse()
    return ",".join(chunks) + "," + last_three