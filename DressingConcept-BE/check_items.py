
from app import create_app, db
from app.models.billing import BillItem

app = create_app()
with app.app_context():
    items = BillItem.query.all()
    print(f"{'ID':<5} | {'ProdID':<7} | {'SnapshotCode':<15} | {'RelCode':<15}")
    print("-" * 60)
    for i in items:
        rel_code = i.product.product_code if i.product else "N/A"
        print(f"{i.id:<5} | {i.product_id:<7} | {str(i.product_code):<15} | {str(rel_code):<15}")
