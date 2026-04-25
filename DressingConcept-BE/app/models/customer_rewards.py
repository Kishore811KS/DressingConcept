from app import db
from datetime import datetime

class CustomerRewards(db.Model):
    __tablename__ = 'customer_rewards'

    phone = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=True)
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
            'totalPointsEarned': round(self.total_points_earned, 2),
            'totalPointsRedeemed': round(self.total_points_redeemed, 2),
            'currentBalance': round(self.current_balance, 2),
            'totalSpend': round(self.total_spend, 2),
            'billCount': self.bill_count,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
