
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE bill_items ADD COLUMN product_code VARCHAR(100)'))
        db.session.commit()
        print("Column product_code added successfully to bill_items")
    except Exception as e:
        print(f"Error: {e}")
