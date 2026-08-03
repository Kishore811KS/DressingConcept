# run.py
from app import create_app, db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        try:
            db.session.execute(db.text("ALTER TABLE products ADD COLUMN discount_amount FLOAT DEFAULT 0"))
            db.session.commit()
        except Exception:
            db.session.rollback()
    app.run(debug=True, port=5000)
