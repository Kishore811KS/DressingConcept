# app/models/sale_return.py
from app import db
from datetime import datetime

class SaleReturn(db.Model):
    __tablename__ = "sale_returns"

    id = db.Column(db.Integer, primary_key=True)
    return_number = db.Column(db.String(50), unique=True, nullable=False)
    original_bill_number = db.Column(db.String(50), nullable=False)

    # Customer Information
    customer_name = db.Column(db.String(100), nullable=False, default='Walk-in Customer')
    customer_phone = db.Column(db.String(20))
    customer_address = db.Column(db.String(200))

    # Financial Details
    subtotal = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    tax = db.Column(db.Float, default=0.0)
    total_return_amount = db.Column(db.Float, default=0.0)
    reward_points_deducted = db.Column(db.Float, default=0.0)

    # Payment & Audit Metadata
    payment_method = db.Column(db.String(50), default='cash')
    created_by = db.Column(db.Integer, nullable=True)
    created_by_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    items = db.relationship('SaleReturnItem', backref='sale_return', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        display_ret = self.return_number.split('/', 1)[-1] if (self.return_number and '/' in self.return_number) else self.return_number
        display_orig = self.original_bill_number.split('/', 1)[-1] if (self.original_bill_number and '/' in self.original_bill_number) else self.original_bill_number
        return {
            'id': self.id,
            'returnNumber': display_ret,
            'originalBillNumber': display_orig,
            'rawReturnNumber': self.return_number,
            'customerName': self.customer_name,
            'customerPhone': self.customer_phone,
            'customerAddress': self.customer_address,
            'subtotal': round(self.subtotal or 0, 2),
            'discount': round(self.discount or 0, 2),
            'tax': round(self.tax or 0, 2),
            'totalReturnAmount': round(self.total_return_amount or 0, 2),
            'rewardPointsDeducted': round(self.reward_points_deducted or 0, 2),
            'paymentMethod': self.payment_method,
            'createdBy': self.created_by,
            'createdByName': self.created_by_name or 'Admin',
            'returnDate': self.created_at.strftime('%Y-%m-%d') if self.created_at else None,
            'returnTime': self.created_at.strftime('%I:%M %p') if self.created_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'items': [item.to_dict() for item in self.items]
        }


class SaleReturnItem(db.Model):
    __tablename__ = "sale_return_items"

    id = db.Column(db.Integer, primary_key=True)
    sale_return_id = db.Column(db.Integer, db.ForeignKey('sale_returns.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)

    # Product details snapshot
    product_code = db.Column(db.String(100))
    product_name = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(20), default='PCS')
    tax = db.Column(db.Float, default=0.0)
    mrp = db.Column(db.Float, default=0.0)
    sell_price = db.Column(db.Float, nullable=False, default=0.0)
    original_quantity = db.Column(db.Integer, nullable=False, default=1)
    returned_quantity = db.Column(db.Integer, nullable=False, default=1)
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    sales_person = db.Column(db.String(100))

    def to_dict(self):
        return {
            'id': self.id,
            'saleReturnId': self.sale_return_id,
            'productId': self.product_id,
            'productCode': self.product_code,
            'productName': self.product_name,
            'unit': self.unit,
            'tax': round(self.tax or 0, 2),
            'mrp': round(self.mrp or 0, 2),
            'sellPrice': round(self.sell_price or 0, 2),
            'originalQuantity': self.original_quantity,
            'returnedQuantity': self.returned_quantity,
            'totalAmount': round(self.total_amount or 0, 2),
            'salesPerson': self.sales_person
        }
