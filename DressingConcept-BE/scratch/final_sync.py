
from app import create_app, db
from app.models.product import Product
from app.models.supplier import Item
from sqlalchemy import func

app = create_app()
with app.app_context():
    print("Performing full synchronization...")
    
    # 1. Get all unique item names from Item table
    unique_names = db.session.query(Item.name).distinct().all()
    item_names = [name[0] for name in unique_names]
    
    # 2. Reset all product quantities to 0 first (optional but safer)
    products = Product.query.all()
    for p in products:
        p.quantity = 0
    db.session.commit()
    
    # 3. Import the sync helper logic (or replicate it here)
    def sync_item_to_product(item_name):
        # Calculate total quantity for this item name across all suppliers
        total_qty = db.session.query(func.sum(Item.quantity)).filter(
            Item.name.ilike(item_name)
        ).scalar() or 0
        
        # Find the latest price/details for this item name
        latest_item = Item.query.filter(Item.name.ilike(item_name)).order_by(Item.updated_at.desc()).first()
        
        if not latest_item:
            return

        # Find or create corresponding product
        product = Product.query.filter(Product.name.ilike(item_name)).first()
        
        if not product:
            print(f"Creating new product: {item_name}")
            product = Product(
                name=latest_item.name,
                model=latest_item.model,
                type=latest_item.type,
                buy_price=latest_item.buy_price,
                sell_price=latest_item.sell_price,
                quantity=total_qty,
                unit=latest_item.type or "PCS"
            )
            product.calculate_values()
            db.session.add(product)
        else:
            print(f"Updating existing product: {item_name} -> Qty: {total_qty}")
            product.quantity = total_qty
            product.buy_price = latest_item.buy_price
            if latest_item.sell_price > 0:
                product.sell_price = latest_item.sell_price
            product.calculate_values()
            
        db.session.commit()

    for name in item_names:
        sync_item_to_product(name)
        
    print("Full synchronization complete.")
