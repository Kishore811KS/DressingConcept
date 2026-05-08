
from app import create_app, db
from app.models.billing import BillItem

app = create_app()
with app.app_context():
    items = BillItem.query.all()
    for i in items:
        d = i.to_dict()
        print(f"Item {i.id}: productCode={d.get('productCode')}, productId={d.get('productId')}")
