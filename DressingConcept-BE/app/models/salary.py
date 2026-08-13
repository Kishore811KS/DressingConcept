from app import db
from datetime import datetime

class Salary(db.Model):
    __tablename__ = 'salaries'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    
    basic_salary = db.Column(db.Float, default=0.0)
    calculated_salary = db.Column(db.Float, default=0.0)
    advance_amount = db.Column(db.Float, default=0.0)
    
    status = db.Column(db.String(20), default='pending')  # paid, pending
    payment_date = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    employee = db.relationship('Employee', backref='salaries')
    
    def to_dict(self):
        calc = self.calculated_salary or 0.0
        adv = self.advance_amount or 0.0
        net = max(0.0, calc - adv)
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'month': self.month,
            'year': self.year,
            'basic_salary': self.basic_salary,
            'calculated_salary': calc,
            'advance_amount': adv,
            'net_salary': net,
            'status': self.status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
