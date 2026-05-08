
from app import create_app, db
from app.models.product import Product

app = create_app()
with app.app_context():
    products = Product.query.all()
    print(f"{'ID':<5} | {'Code':<15} | {'Name':<20}")
    print("-" * 50)
    for p in products:
        print(f"{p.id:<5} | {str(p.product_code):<15} | {p.name:<20}")
