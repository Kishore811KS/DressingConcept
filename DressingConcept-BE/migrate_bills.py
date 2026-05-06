import sys
import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app import create_app, db
from sqlalchemy import inspect, text

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    if "bills" in inspector.get_table_names():
        existing_columns = {column["name"] for column in inspector.get_columns("bills")}
        print(f"Existing columns: {existing_columns}")
        required_columns = {
            "payment_online_phone": "VARCHAR(20) NULL",
            "payment_online_ref": "VARCHAR(100) NULL",
        }

        for column_name, column_definition in required_columns.items():
            if column_name not in existing_columns:
                print(f"Adding column {column_name} to bills table...")
                db.session.execute(text(f"ALTER TABLE bills ADD COLUMN {column_name} {column_definition}"))
        
        db.session.commit()
        print("Migration check complete.")
    else:
        print("Bills table not found.")
