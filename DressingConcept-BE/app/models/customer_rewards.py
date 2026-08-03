from app import db
from datetime import datetime

class CustomerRewards(db.Model):
    __tablename__ = 'customer_rewards'

    phone = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=True)

    # Extended customer profile fields
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    address = db.Column(db.String(300), nullable=True)
    gst = db.Column(db.String(50), nullable=True)
    customer_type = db.Column(db.String(50), nullable=True, default='regular')

    date_of_birth = db.Column(db.Date, nullable=True)
    member_id = db.Column(db.String(50), nullable=True)
    wedding_anniversary = db.Column(db.Date, nullable=True)
    celebration_date = db.Column(db.Date, nullable=True)
    is_classic_customer = db.Column(db.Boolean, default=False)
    is_supplier = db.Column(db.Boolean, default=False)
    supplier_igst = db.Column(db.Float, nullable=True, default=0.0)

    # Reward / spend tracking
    total_points_earned = db.Column(db.Float, default=0.0)
    total_points_redeemed = db.Column(db.Float, default=0.0)
    current_balance = db.Column(db.Float, default=0.0)
    total_spend = db.Column(db.Float, default=0.0)
    bill_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'phone': self.phone,
            'name': self.name,
            'firstName': self.first_name or '',
            'lastName': self.last_name or '',
            'email': self.email or '',
            'address': self.address or '',
            'gst': self.gst or '',
            'customerType': self.customer_type or 'regular',
            'dateOfBirth': self.date_of_birth.isoformat() if self.date_of_birth else '',
            'memberId': self.member_id or '',
            'weddingAnniversary': self.wedding_anniversary.isoformat() if self.wedding_anniversary else '',
            'celebrationDate': self.celebration_date.isoformat() if self.celebration_date else '',
            'isClassicCustomer': bool(self.is_classic_customer),
            'isSupplier': bool(self.is_supplier),
            'supplierIGST': round(self.supplier_igst or 0, 2),
            'totalPointsEarned': round(self.total_points_earned, 2),
            'totalPointsRedeemed': round(self.total_points_redeemed, 2),
            'currentBalance': round(self.current_balance, 2),
            'totalSpend': round(self.total_spend, 2),
            'billCount': self.bill_count,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
