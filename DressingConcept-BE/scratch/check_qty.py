
from app import create_app, db
from app.models.product import Product
from app.models.supplier import Item
from sqlalchemy import func

app = create_app()
with app.app_context():
    print("--- Products ---")
    products = Product.query.all()
    total_product_qty = 0
    for p in products:
        print(f"ID: {p.id}, Name: {p.name}, Qty: {p.quantity}")
        total_product_qty += p.quantity
    print(f"Total Product Qty: {total_product_qty}")

    print("\n--- Items (Stock In) ---")
    items = Item.query.all()
    total_item_qty = 0
    for i in items:
        print(f"ID: {i.id}, Name: {i.name}, Qty: {i.quantity}")
        total_item_qty += i.quantity
    print(f"Total Item Qty: {total_item_qty}")
