import os
import sys
from app import create_app, db
from app.models import Employee, Attendance, Salary, HRConfig
from datetime import date
from sqlalchemy import func

app = create_app()
with app.app_context():
    try:
        print("Testing manual attendance list logic...")
        target_date = date.today()
        employees = Employee.query.all()
        results = []
        for emp in employees:
            print(f"Checking for {emp.full_name}")
            attendance = Attendance.query.filter_by(employee_id=emp.id, date=target_date).first()
            if not attendance:
                print(f"Creating attendance for {emp.full_name}")
                attendance = Attendance(employee_id=emp.id, date=target_date, status='present')
                db.session.add(attendance)
                db.session.flush()
            results.append(attendance.to_dict())
        print(f"Results: {len(results)} items.")
        db.session.commit()
        
        print("\nTesting manual salary calculation logic...")
        month, year = 5, 2026
        results = []
        for emp in employees:
            print(f"Calculating salary for {emp.full_name}")
            attendances = Attendance.query.filter(
                Attendance.employee_id == emp.id,
                func.month(Attendance.date) == month,
                func.year(Attendance.date) == year
            ).all()
            print(f"Found {len(attendances)} attendance records.")
        print("Manual logic test passed.")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
