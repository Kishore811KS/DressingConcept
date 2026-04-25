# run.py
import sys
import io
import codecs

# Override stdout to handle unicode characters like emojis
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app import create_app, db
from sqlalchemy import inspect, text

app = create_app()

def ensure_product_attribute_columns():
    inspector = inspect(db.engine)
    existing_columns = {column["name"] for column in inspector.get_columns("products")}
    required_columns = {
        "product_code": "VARCHAR(100) NULL",
        "description": "VARCHAR(255) NULL",
        "size": "VARCHAR(100) NULL",
        "unit": "VARCHAR(50) NULL DEFAULT 'PCS'",
        "tax": "FLOAT NULL DEFAULT 0",
        "mrp": "FLOAT NULL DEFAULT 0",
        "discount_percent": "FLOAT NULL DEFAULT 0",
        "net_price": "FLOAT NULL DEFAULT 0",
        "sales_person": "VARCHAR(100) NULL",
    }

    for column_name, column_definition in required_columns.items():
        if column_name not in existing_columns:
            db.session.execute(text(f"ALTER TABLE products ADD COLUMN {column_name} {column_definition}"))

    db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        ensure_product_attribute_columns()
    app.run(debug=True, port=5000)
