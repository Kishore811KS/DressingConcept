from app import db
from datetime import datetime

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    product_code = db.Column(db.String(100))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    model = db.Column(db.String(100))
    unit = db.Column(db.String(50), default="PCS")
    tax = db.Column(db.Float, default=0)
    mrp = db.Column(db.Float, default=0)
    discount_percent = db.Column(db.Float, default=0)
    discount_amount = db.Column(db.Float, default=0)
    net_price = db.Column(db.Float, default=0)
    sales_person = db.Column(db.String(100))
    classic_customer = db.Column(db.String(20))
    type = db.Column(db.String(100))
    watts = db.Column(db.Float)

    buy_price = db.Column(db.Float, nullable=False)
    sell_price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    profit_percent = db.Column(db.Float)
    amount = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


    def calculate_values(self):
        base_price = self.mrp or self.sell_price or 0
        disc_amt = float(self.discount_amount) if getattr(self, 'discount_amount', None) is not None else 0

        if disc_amt > 0 and base_price > 0:
            self.discount_percent = round((disc_amt / base_price) * 100, 2)
            self.discount_amount = round(disc_amt, 2)
        elif getattr(self, 'discount_percent', 0) and getattr(self, 'discount_percent', 0) > 0 and base_price > 0:
            self.discount_amount = round(base_price * (self.discount_percent / 100), 2)
        else:
            self.discount_amount = round(disc_amt, 2)

        discount = self.discount_percent or 0
        self.net_price = round((self.sell_price or 0) - ((self.sell_price or 0) * discount / 100), 2)

        # Normal Profit = Selling Price - Buy Price
        sell_price_val = self.sell_price if (self.sell_price is not None and self.sell_price > 0) else (self.discount_amount if (self.discount_amount is not None and self.discount_amount > 0) else (self.mrp or 0))
        self.normal_profit = round((sell_price_val or 0) - (self.buy_price or 0), 2)
        
        # Classic Customer Profit = Classic Customer Price - Buy Price
        try:
            classic_price = float(self.classic_customer) if self.classic_customer else 0
        except (ValueError, TypeError):
            classic_price = 0
            
        self.classic_profit = round(classic_price - (self.buy_price or 0), 2) if classic_price > 0 else 0
        
        # Original profit logic for backward compatibility if needed
        profit_base = classic_price if classic_price > 0 else sell_price_val
        self.profit = round(profit_base - (self.buy_price or 0), 2)

        if self.buy_price and self.buy_price > 0:
            self.profit_percent = round(
                (self.profit / self.buy_price) * 100, 2
            )
        else:
            self.profit_percent = 0

        self.amount = round((self.net_price or self.sell_price or 0) * self.quantity, 2)

    def to_dict(self):
        # Ensure values are calculated
        try:
            classic_price = float(self.classic_customer) if self.classic_customer else 0
        except (ValueError, TypeError):
            classic_price = 0

        disc_amt = getattr(self, 'discount_amount', 0)
        if (disc_amt is None or disc_amt == 0) and getattr(self, 'discount_percent', 0) and (self.mrp or self.sell_price):
            base_price = self.mrp or self.sell_price or 0
            disc_amt = round(base_price * ((self.discount_percent or 0) / 100), 2)

        sell_price_val = self.sell_price if (self.sell_price is not None and self.sell_price > 0) else (disc_amt if disc_amt > 0 else (self.mrp or 0))

        return {
            "id": self.id,
            "productCode": self.product_code,
            "name": self.name,
            "description": self.description,
            "model": self.model,
            "unit": self.unit,
            "tax": self.tax,
            "mrp": self.mrp,
            "discountPercent": self.discount_percent,
            "discountAmount": round(disc_amt or 0, 2),
            "netPrice": self.net_price,
            "salesPerson": self.sales_person,
            "classicCustomer": self.classic_customer,
            "type": self.type,
            "watts": self.watts,
            "buyPrice": self.buy_price,
            "sellPrice": self.sell_price,
            "quantity": self.quantity,
            "profit": getattr(self, 'profit', round((classic_price if classic_price > 0 else (sell_price_val or 0)) - (self.buy_price or 0), 2)),
            "normalProfit": getattr(self, 'normal_profit', round((sell_price_val or 0) - (self.buy_price or 0), 2)),
            "classicProfit": getattr(self, 'classic_profit', round((classic_price - (self.buy_price or 0)) if classic_price > 0 else 0, 2)),
            "profitPercent": self.profit_percent,
            "amount": self.amount,
            "created_at": self.created_at
        }
