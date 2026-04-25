from app import db
from datetime import datetime

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    product_code = db.Column(db.String(100))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    model = db.Column(db.String(100))
    size = db.Column(db.String(100))
    unit = db.Column(db.String(50), default="PCS")
    tax = db.Column(db.Float, default=0)
    mrp = db.Column(db.Float, default=0)
    discount_percent = db.Column(db.Float, default=0)
    net_price = db.Column(db.Float, default=0)
    sales_person = db.Column(db.String(100))
    type = db.Column(db.String(100))
    watts = db.Column(db.Float)

    buy_price = db.Column(db.Float, nullable=False)
    sell_price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    profit_percent = db.Column(db.Float)
    amount = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def calculate_values(self):
        discount = self.discount_percent or 0
        self.net_price = round((self.sell_price or 0) - ((self.sell_price or 0) * discount / 100), 2)

        if self.buy_price and self.buy_price > 0:
            self.profit_percent = round(
                ((self.sell_price - self.buy_price) / self.buy_price) * 100, 2
            )
        else:
            self.profit_percent = 0

        self.amount = round((self.net_price or self.sell_price or 0) * self.quantity, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "productCode": self.product_code,
            "name": self.name,
            "description": self.description,
            "model": self.model,
            "size": self.size,
            "unit": self.unit,
            "tax": self.tax,
            "mrp": self.mrp,
            "discountPercent": self.discount_percent,
            "netPrice": self.net_price,
            "salesPerson": self.sales_person,
            "type": self.type,
            "watts": self.watts,
            "buyPrice": self.buy_price,
            "sellPrice": self.sell_price,
            "quantity": self.quantity,
            "profitPercent": self.profit_percent,
            "amount": self.amount,
            "created_at": self.created_at
        }
