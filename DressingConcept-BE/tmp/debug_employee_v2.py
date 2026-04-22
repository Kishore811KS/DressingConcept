
import sys
import os
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.employee import Employee
from datetime import datetime

app = create_app()
with app.app_context():
    print(f"DATABASE URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    try:
        emp = Employee.query.first()
        if not emp:
            print("No employees found.")
        else:
            print(f"Employee ID: {emp.id}, Name: {emp.full_name}")
            print(emp.to_dict())
    except Exception as e:
        import traceback
        traceback.print_exc()
