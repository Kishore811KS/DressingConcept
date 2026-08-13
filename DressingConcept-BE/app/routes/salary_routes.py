from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, date
import calendar
from app import db
from app.models import Salary, Employee, Attendance, HRConfig, AdvanceSalary
from sqlalchemy import func, text
import logging

salary_bp = Blueprint('salary', __name__)
logger = logging.getLogger(__name__)

def _ensure_salary_columns():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE salaries ADD COLUMN advance_amount FLOAT DEFAULT 0.0"))
            conn.commit()
    except Exception:
        pass

@salary_bp.route('/calculate', methods=['GET'])
def calculate_salaries():
    """Calculate salaries for all employees for a given month/year"""
    _ensure_salary_columns()
    try:
        month = request.args.get('month', datetime.now().month, type=int)
        year = request.args.get('year', datetime.now().year, type=int)
        
        employees = Employee.query.all()
        results = []
        
        # Get total days in month (calendar days e.g. Jan=31, Feb=28/29, Mar=31, Apr=30)
        _, num_days = calendar.monthrange(year, month)
        monthly_working_days = num_days
        
        for emp in employees:
            # Check if salary already exists for this month/year
            salary_record = Salary.query.filter_by(employee_id=emp.id, month=month, year=year).first()
            
            # Calculate attendance based on status
            attendances = Attendance.query.filter(
                Attendance.employee_id == emp.id,
                func.month(Attendance.date) == month,
                func.year(Attendance.date) == year
            ).all()
            
            present_days = sum(1 for a in attendances if a.status == 'present')
            paid_leaves = sum(1 for a in attendances if a.status == 'paid_leave')
            half_days = sum(1 for a in attendances if a.status == 'half_day')
            
            # Effective paid days = Present + Paid Leaves + (Half Days * 0.5)
            effective_days = present_days + paid_leaves + (half_days * 0.5)
            per_day_rate = emp.basic_salary or 0
            calculated_salary = effective_days * per_day_rate
            
            # Calculate pending advance amount to deduct for this employee
            if salary_record and salary_record.status == 'paid':
                # If already paid, advance amount is fixed based on advance records linked to this salary
                deducted_advances = AdvanceSalary.query.filter_by(salary_id=salary_record.id).all()
                if deducted_advances:
                    advance_amount = sum(a.amount for a in deducted_advances)
                else:
                    advance_amount = salary_record.advance_amount or 0.0
            else:
                # If pending or new, calculate sum of all currently pending advances for this employee
                pending_advances = AdvanceSalary.query.filter_by(employee_id=emp.id, status='pending').all()
                advance_amount = sum(a.amount for a in pending_advances)
            
            if not salary_record:
                salary_record = Salary(
                    employee_id=emp.id,
                    month=month,
                    year=year,
                    basic_salary=per_day_rate,
                    calculated_salary=round(calculated_salary, 2),
                    advance_amount=round(advance_amount, 2),
                    status='pending'
                )
                db.session.add(salary_record)
            else:
                salary_record.basic_salary = per_day_rate
                salary_record.calculated_salary = round(calculated_salary, 2)
                if salary_record.status != 'paid':
                    salary_record.advance_amount = round(advance_amount, 2)
            
            res_dict = salary_record.to_dict()
            res_dict.update({
                'present_days': present_days,
                'paid_leaves': paid_leaves,
                'half_days': half_days,
                'unpaid_leaves': sum(1 for a in attendances if a.status == 'leave'),
                'absent_days': sum(1 for a in attendances if a.status == 'absent'),
                'effective_days': effective_days,
                'num_days_in_month': num_days,
                'working_days_threshold': monthly_working_days
            })
            results.append(res_dict)
            
        db.session.commit()
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"Salary calculation error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@salary_bp.route('/update-status', methods=['PUT'])
def update_salary_status():
    """Update payment status of a salary record and sync advance deductions"""
    _ensure_salary_columns()
    try:
        data = request.get_json()
        salary_id = data.get('salary_id')
        status = data.get('status')  # 'paid' or 'pending'
        
        salary_record = Salary.query.get(salary_id)
        if not salary_record:
            return jsonify({'error': 'Salary record not found'}), 404
            
        salary_record.status = status
        if status == 'paid':
            salary_record.payment_date = datetime.utcnow()
            # Link all pending advances for this employee to this salary record & mark as deducted
            pending_advances = AdvanceSalary.query.filter_by(
                employee_id=salary_record.employee_id,
                status='pending'
            ).all()
            for adv in pending_advances:
                adv.status = 'deducted'
                adv.salary_id = salary_record.id
            
            # Recalculate advance_amount on salary record to match exact deducted amount
            total_deducted = sum(a.amount for a in AdvanceSalary.query.filter_by(salary_id=salary_record.id).all())
            salary_record.advance_amount = round(total_deducted, 2)
        else:
            salary_record.payment_date = None
            # Revert advances linked to this salary record back to pending
            deducted_advances = AdvanceSalary.query.filter_by(salary_id=salary_record.id).all()
            for adv in deducted_advances:
                adv.status = 'pending'
                adv.salary_id = None

            # Re-sum all pending advances for employee
            pending_advances = AdvanceSalary.query.filter_by(
                employee_id=salary_record.employee_id,
                status='pending'
            ).all()
            salary_record.advance_amount = round(sum(a.amount for a in pending_advances), 2)
            
        db.session.commit()
        return jsonify(salary_record.to_dict()), 200
        
    except Exception as e:
        logger.error(f"Salary status update error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@salary_bp.route('/update-advance', methods=['PUT'])
def update_salary_advance():
    """Update advance salary amount manually for an employee's salary record"""
    _ensure_salary_columns()
    try:
        data = request.get_json()
        salary_id = data.get('salary_id')
        advance_amount = float(data.get('advance_amount', 0.0) or 0.0)
        
        salary_record = Salary.query.get(salary_id)
        if not salary_record:
            return jsonify({'error': 'Salary record not found'}), 404
            
        salary_record.advance_amount = max(0.0, advance_amount)
        db.session.commit()
        return jsonify(salary_record.to_dict()), 200
        
    except Exception as e:
        logger.error(f"Salary advance update error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@salary_bp.route('/pay-all', methods=['POST'])
def pay_all():
    """Mark all pending salaries as paid for a given month/year and mark advances as deducted"""
    _ensure_salary_columns()
    try:
        data = request.get_json()
        month = data.get('month')
        year = data.get('year')
        
        salaries = Salary.query.filter_by(month=month, year=year, status='pending').all()
        for s in salaries:
            s.status = 'paid'
            s.payment_date = datetime.utcnow()
            
            pending_advances = AdvanceSalary.query.filter_by(
                employee_id=s.employee_id,
                status='pending'
            ).all()
            for adv in pending_advances:
                adv.status = 'deducted'
                adv.salary_id = s.id
            
            total_deducted = sum(a.amount for a in AdvanceSalary.query.filter_by(salary_id=s.id).all())
            s.advance_amount = round(total_deducted, 2)
            
        db.session.commit()
        return jsonify({'message': f'Marked {len(salaries)} salaries as paid'}), 200
        
    except Exception as e:
        logger.error(f"Pay all error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ------------------- ADVANCE SALARY ROUTES -------------------

@salary_bp.route('/advance', methods=['POST'])
def add_advance():
    """Add a new advance salary entry for an employee"""
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        amount = float(data.get('amount', 0.0) or 0.0)
        date_str = data.get('date')
        remarks = data.get('remarks', '')

        if not employee_id:
            return jsonify({'error': 'Employee ID is required'}), 400
        if amount <= 0:
            return jsonify({'error': 'Advance amount must be greater than 0'}), 400

        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({'error': 'Employee not found'}), 404

        adv_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else date.today()

        advance_entry = AdvanceSalary(
            employee_id=emp.id,
            date=adv_date,
            amount=round(amount, 2),
            remarks=remarks,
            status='pending'
        )
        db.session.add(advance_entry)
        db.session.commit()

        # Update current pending salary record advance_amount if present
        latest_pending_salary = Salary.query.filter_by(employee_id=emp.id, status='pending').order_by(Salary.year.desc(), Salary.month.desc()).first()
        if latest_pending_salary:
            pending_sum = sum(a.amount for a in AdvanceSalary.query.filter_by(employee_id=emp.id, status='pending').all())
            latest_pending_salary.advance_amount = round(pending_sum, 2)
            db.session.commit()

        return jsonify(advance_entry.to_dict()), 201

    except Exception as e:
        logger.error(f"Add advance error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@salary_bp.route('/advance', methods=['GET'])
def get_advances():
    """Get advance salary entries for a specific employee or all employees"""
    try:
        employee_id = request.args.get('employee_id', type=int)
        query = AdvanceSalary.query
        if employee_id:
            query = query.filter_by(employee_id=employee_id)

        advances = query.order_by(AdvanceSalary.date.desc(), AdvanceSalary.id.desc()).all()
        adv_list = [a.to_dict() for a in advances]

        total_pending = sum(a.amount for a in advances if a.status == 'pending')
        total_deducted = sum(a.amount for a in advances if a.status == 'deducted')

        return jsonify({
            'advances': adv_list,
            'total_pending': round(total_pending, 2),
            'total_deducted': round(total_deducted, 2)
        }), 200

    except Exception as e:
        logger.error(f"Get advances error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@salary_bp.route('/advance/<int:advance_id>', methods=['DELETE'])
def delete_advance(advance_id):
    """Delete a pending advance salary entry"""
    try:
        adv = AdvanceSalary.query.get(advance_id)
        if not adv:
            return jsonify({'error': 'Advance record not found'}), 404

        if adv.status == 'deducted':
            return jsonify({'error': 'Cannot delete an advance entry that has already been deducted from salary'}), 400

        emp_id = adv.employee_id
        db.session.delete(adv)
        db.session.commit()

        # Recalculate pending salary record advance_amount
        latest_pending_salary = Salary.query.filter_by(employee_id=emp_id, status='pending').order_by(Salary.year.desc(), Salary.month.desc()).first()
        if latest_pending_salary:
            pending_sum = sum(a.amount for a in AdvanceSalary.query.filter_by(employee_id=emp_id, status='pending').all())
            latest_pending_salary.advance_amount = round(pending_sum, 2)
            db.session.commit()

        return jsonify({'message': 'Advance entry deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Delete advance error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
