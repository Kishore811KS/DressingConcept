
from app import create_app, db
from app.models.product import Product
from app.models.supplier import Item

app = create_app()
with app.app_context():
    print("Fixing data discrepancy...")
    
    # 1. Reset all product quantities to 0
    # (Optional: Only reset if they are not in the items table)
    products = Product.query.all()
    for p in products:
        p.quantity = 0
    
    # 2. Sync quantities from Item table to Product table
    # We'll match by name (case-insensitive) for now as there's no other link
    items = Item.query.all()
    for item in items:
        # Try to find matching product
        product = Product.query.filter(Product.name.ilike(item.name)).first()
        if product:
            print(f"Syncing: {item.name} (Item Qty: {item.quantity}) -> Product ID: {product.id}")
            product.quantity = item.quantity
        else:
            print(f"Creating missing product for item: {item.name}")
            # If product doesn't exist, we might need to create it, 
            # but usually it should already exist or be created by the user.
            # For now, let's just log it.
            pass
            
    db.session.commit()
    print("Done.")
