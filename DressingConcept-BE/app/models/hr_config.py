from app import db
from datetime import datetime

class HRConfig(db.Model):
    __tablename__ = 'hr_config'
    
    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    working_days = db.Column(db.Integer, default=22)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'month': self.month,
            'year': self.year,
            'working_days': self.working_days
        }
