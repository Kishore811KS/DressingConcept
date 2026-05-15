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

def ensure_bill_payment_columns():
    inspector = inspect(db.engine)
    if "bills" in inspector.get_table_names():
        existing_columns = {column["name"] for column in inspector.get_columns("bills")}
        required_columns = {
            "payment_online_phone": "VARCHAR(20) NULL",
            "payment_online_ref": "VARCHAR(100) NULL",
            "contact": "VARCHAR(20) NULL",
        }

        for column_name, column_definition in required_columns.items():
            if column_name not in existing_columns:
                db.session.execute(text(f"ALTER TABLE bills ADD COLUMN {column_name} {column_definition}"))

        db.session.commit()


def ensure_profit_columns():
    inspector = inspect(db.engine)
    
    # Check bills table
    if "bills" in inspector.get_table_names():
        bill_columns = {column["name"] for column in inspector.get_columns("bills")}
        if "profit" not in bill_columns:
            db.session.execute(text("ALTER TABLE bills ADD COLUMN profit FLOAT DEFAULT 0"))
            db.session.commit()
            
    # Check bill_items table
    if "bill_items" in inspector.get_table_names():
        item_columns = {column["name"] for column in inspector.get_columns("bill_items")}
        if "buy_price" not in item_columns:
            db.session.execute(text("ALTER TABLE bill_items ADD COLUMN buy_price FLOAT DEFAULT 0"))
        if "profit" not in item_columns:
            db.session.execute(text("ALTER TABLE bill_items ADD COLUMN profit FLOAT DEFAULT 0"))
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        ensure_product_attribute_columns()
        ensure_bill_payment_columns()
        ensure_profit_columns()
    app.run(debug=True, port=5000)
