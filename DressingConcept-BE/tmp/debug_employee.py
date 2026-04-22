
import sys
import os
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.employee import Employee
from datetime import datetime

app = create_app()
with app.app_context():
    emp = Employee.query.first()
    if not emp:
        print("No employees found.")
        sys.exit(0)
    
    print(f"Employee ID: {emp.id}")
    print(f"Full Name: {emp.full_name}")
    print(f"date_of_joining: {type(emp.date_of_joining)} {emp.date_of_joining}")
    print(f"created_at: {type(emp.created_at)} {emp.created_at}")
    print(f"updated_at: {type(emp.updated_at)} {emp.updated_at}")
    
    try:
        d = emp.to_dict()
        print("to_dict() success!")
        print(d)
    except Exception as e:
        import traceback
        print(f"to_dict() FAILED: {str(e)}")
        traceback.print_exc()
