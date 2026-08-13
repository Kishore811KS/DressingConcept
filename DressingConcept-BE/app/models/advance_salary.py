from app import db
from datetime import datetime, date

class AdvanceSalary(db.Model):
    __tablename__ = 'advance_salaries'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    remarks = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'deducted'
    salary_id = db.Column(db.Integer, db.ForeignKey('salaries.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = db.relationship('Employee', backref=db.backref('advance_salaries', lazy=True))
    salary = db.relationship('Salary', backref=db.backref('advance_records', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'date': self.date.isoformat() if self.date else None,
            'amount': self.amount,
            'remarks': self.remarks or '',
            'status': self.status,
            'salary_id': self.salary_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
