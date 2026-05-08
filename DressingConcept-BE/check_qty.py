
from app import create_app, db
from app.models.product import Product

app = create_app()
with app.app_context():
    products = Product.query.filter(~Product.name.like('___DELETED%')).all()
    print(f"{'ID':<5} | {'Name':<20} | {'Qty':<5}")
    print("-" * 40)
    for p in products:
        print(f"{p.id:<5} | {p.name:<20} | {p.quantity:<5}")
