# app/routes/sale_return_routes.py
from flask import Blueprint, request, jsonify
from app import db
from app.models.sale_return import SaleReturn, SaleReturnItem
from app.models.billing import Bill
from app.models.product import Product
from app.models.supplier import Item
from app.models.customer_rewards import CustomerRewards
from datetime import datetime, timedelta
import math
import traceback
import re

sale_return_bp = Blueprint('sale_return_bp', __name__)

def generate_return_number():
    """Generate a unique Sale Return Number e.g. 0001R, 0002R"""
    from app.routes.billing_routes import generate_unique_bill_number
    return generate_unique_bill_number('R')


@sale_return_bp.route('/sale-returns', methods=['POST'])
def create_sale_return():
    try:
        data = request.get_json() or {}
        
        original_bill_number = str(data.get('originalBillNumber', '')).strip()

        # Smart candidate matching for original bill
        original_bill = None
        if original_bill_number and original_bill_number.upper() != "DIRECT":
            original_bill = Bill.query.filter_by(bill_number=original_bill_number).first()
            if not original_bill:
                from app.routes.billing_routes import get_current_financial_year
                fy_prefix = get_current_financial_year()
                clean_no = original_bill_number.split('/')[-1].rstrip('N').rstrip('n').rstrip('R').rstrip('r')
                clean_digits = re.sub(r'\D', '', clean_no)
                possible = set([original_bill_number, original_bill_number.upper(), clean_no])
                if clean_digits:
                    num = int(clean_digits)
                    padded = clean_digits.zfill(4)
                    possible.update([
                        f"{fy_prefix}/{num}N",
                        f"{fy_prefix}/{num}R",
                        f"{fy_prefix}/{padded}N",
                        f"{num}N",
                        f"{num}R",
                        f"{padded}N",
                        f"{padded}R"
                    ])
                original_bill = Bill.query.filter(Bill.bill_number.in_(list(possible))).first()

        ref_bill_no = original_bill.bill_number if original_bill else (original_bill_number or "DIRECT")

        items_data = data.get('items', [])
        if not items_data or len(items_data) == 0:
            return jsonify({'error': 'At least one item must be returned.'}), 400

        # Calculate total return amount early to check anti-duplicate
        computed_subtotal = 0.0
        for item_info in items_data:
            mrp = float(item_info.get('mrp', 0) or 0)
            sell_price = float(item_info.get('sellPrice') or item_info.get('netPrice') or mrp or 0)
            returned_qty = int(item_info.get('returnedQuantity') or item_info.get('quantity') or 1)
            if returned_qty > 0:
                computed_subtotal += round(sell_price * returned_qty, 2)

        total_return_amount = float(data.get('totalReturnAmount') or computed_subtotal)

        # ── ANTI-DUPLICATE SUBMISSION CHECK ──
        # If an identical return for the same bill was processed in the last 15 seconds, return existing instead of duplicating
        recent_duplicate = SaleReturn.query.filter(
            SaleReturn.original_bill_number == ref_bill_no,
            SaleReturn.total_return_amount == total_return_amount,
            SaleReturn.created_at >= datetime.utcnow() - timedelta(seconds=15)
        ).first()

        if recent_duplicate:
            return jsonify({
                'message': 'Sale Return already processed (Duplicate submission prevented)',
                'saleReturn': recent_duplicate.to_dict()
            }), 200

        # ── CUMULATIVE PRIOR RETURNS CHECK ──
        prior_returns = SaleReturn.query.filter_by(original_bill_number=ref_bill_no).all() if ref_bill_no else []
        already_returned = {}
        for pr in prior_returns:
            for item in pr.items:
                k_code = str(item.product_code or '').strip().lower()
                k_name = str(item.product_name or '').strip().lower()
                if k_code:
                    already_returned[k_code] = already_returned.get(k_code, 0) + (item.returned_quantity or 0)
                if k_name:
                    already_returned[k_name] = already_returned.get(k_name, 0) + (item.returned_quantity or 0)

        # Compute totals & validate item quantities against prior returns
        sale_return_items = []
        computed_subtotal = 0.0

        for item_info in items_data:
            product_id = item_info.get('productId')
            product_name = str(item_info.get('productName') or item_info.get('description', 'Item')).strip()
            product_code = str(item_info.get('productCode') or item_info.get('productId', '')).strip()
            unit = str(item_info.get('unit', 'PCS')).strip() or 'PCS'
            tax_rate = float(item_info.get('tax', 0) or 0)
            mrp = float(item_info.get('mrp', 0) or 0)
            sell_price = float(item_info.get('sellPrice') or item_info.get('netPrice') or mrp or 0)
            orig_qty = int(item_info.get('originalQuantity') or item_info.get('quantity') or 1)
            returned_qty = int(item_info.get('returnedQuantity') or item_info.get('quantity') or 1)
            sales_person = str(item_info.get('salesPerson', '')).strip()

            if returned_qty <= 0:
                continue

            # Check cumulative returns
            k_code = product_code.lower()
            k_name = product_name.lower()
            prev_ret = max(already_returned.get(k_code, 0), already_returned.get(k_name, 0))
            max_refundable = orig_qty - prev_ret

            item_total = round(sell_price * returned_qty, 2)
            computed_subtotal += item_total

            sale_return_item = SaleReturnItem(
                product_id=product_id if isinstance(product_id, int) else None,
                product_code=product_code,
                product_name=product_name,
                unit=unit,
                tax=tax_rate,
                mrp=mrp,
                sell_price=sell_price,
                original_quantity=orig_qty,
                returned_quantity=returned_qty,
                total_amount=item_total,
                sales_person=sales_person
            )
            sale_return_items.append((sale_return_item, product_id, returned_qty))

        if not sale_return_items:
            return jsonify({'error': 'No valid returned items specified.'}), 400

        discount_amount = float(data.get('discount', 0) or 0)
        tax_amount = float(data.get('tax', 0) or 0)
        subtotal_amount = float(data.get('subtotal') or computed_subtotal)

        # Do not deduct reward points on Sale Return
        reward_points_deducted = 0.0

        req_ret_no = str(data.get('returnNumber', '')).strip()
        if req_ret_no:
            from app.routes.billing_routes import get_current_financial_year
            fy_prefix = get_current_financial_year()
            if '/' in req_ret_no:
                return_number = req_ret_no.upper()
            else:
                clean_seq = req_ret_no.rstrip('R').rstrip('r')
                if not clean_seq.endswith('R'):
                    clean_seq = f"{clean_seq}R"
                return_number = f"{fy_prefix}/{clean_seq}"
        else:
            return_number = generate_return_number()

        customer_phone = str(data.get('customerPhone', '') or data.get('contact', '')).strip()

        cust_name = data.get('customerName') or (original_bill.customer_name if original_bill else '') or 'Walk-in Customer'
        cust_phone = customer_phone or (original_bill.customer_phone if original_bill else '')
        cust_addr = data.get('customerAddress') or (original_bill.customer_address if original_bill else '')

        sale_return = SaleReturn(
            return_number=return_number,
            original_bill_number=original_bill.bill_number if original_bill else original_bill_number,
            customer_name=cust_name,
            customer_phone=cust_phone,
            customer_address=cust_addr,
            subtotal=subtotal_amount,
            discount=discount_amount,
            tax=tax_amount,
            total_return_amount=total_return_amount,
            reward_points_deducted=reward_points_deducted,
            payment_method=data.get('paymentMethod', 'cash'),
            created_by_name=data.get('processedByName', 'Admin')
        )

        for sri, pid, qty in sale_return_items:
            sale_return.items.append(sri)
            
            # Restore stock in Product inventory (Product table)
            prod = None
            if pid:
                if isinstance(pid, int):
                    prod = Product.query.get(pid)
                elif isinstance(pid, str) and pid.isdigit():
                    prod = Product.query.get(int(pid))
            
            if not prod and sri.product_code:
                prod = Product.query.filter_by(product_code=str(sri.product_code)).first()

            if not prod and sri.product_name:
                prod = Product.query.filter_by(name=str(sri.product_name)).first()

            if prod:
                prod.quantity = int(prod.quantity or 0) + int(qty)
                if hasattr(prod, 'calculate_values'):
                    prod.calculate_values()

            # Also restore stock in Supplier Item table if matched
            supp_item = None
            if sri.product_code:
                supp_item = Item.query.filter_by(model=str(sri.product_code)).first()
            if not supp_item and sri.product_name:
                supp_item = Item.query.filter_by(name=str(sri.product_name)).first()
            if supp_item:
                supp_item.quantity = int(supp_item.quantity or 0) + int(qty)

        db.session.add(sale_return)
        db.session.commit()

        return jsonify({
            'message': 'Sale Return processed successfully',
            'saleReturn': sale_return.to_dict()
        }), 201

    except Exception as e:
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@sale_return_bp.route('/sale-returns', methods=['GET'])
def get_sale_returns():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str).strip()

        query = SaleReturn.query

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (SaleReturn.return_number.ilike(search_pattern)) |
                (SaleReturn.original_bill_number.ilike(search_pattern)) |
                (SaleReturn.customer_name.ilike(search_pattern)) |
                (SaleReturn.customer_phone.ilike(search_pattern))
            )

        start_date = request.args.get('startDate', '', type=str).strip()
        end_date = request.args.get('endDate', '', type=str).strip()

        def parse_date(date_str):
            for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%d-%m-%Y', '%d/%m/%Y'):
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    pass
            return None

        if start_date:
            s_dt = parse_date(start_date)
            if s_dt:
                query = query.filter(SaleReturn.created_at >= s_dt)

        if end_date:
            e_dt = parse_date(end_date)
            if e_dt:
                e_dt = e_dt.replace(hour=23, minute=59, second=59)
                query = query.filter(SaleReturn.created_at <= e_dt)

        query = query.order_by(SaleReturn.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'saleReturns': [sr.to_dict() for sr in paginated.items],
            'total': paginated.total,
            'pages': paginated.pages,
            'currentPage': paginated.page
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@sale_return_bp.route('/sale-returns/<identifier>', methods=['GET'])
def get_sale_return_detail(identifier):
    try:
        sr = None
        identifier_str = str(identifier).strip()
        if identifier_str.isdigit():
            sr = SaleReturn.query.get(int(identifier_str))
        if not sr:
            sr = SaleReturn.query.filter_by(return_number=identifier_str).first()
        
        if not sr:
            return jsonify({'error': 'Sale Return record not found.'}), 404

        return jsonify({'saleReturn': sr.to_dict()}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@sale_return_bp.route('/sale-returns/<int:return_id>', methods=['DELETE'])
def delete_sale_return(return_id):
    try:
        sr = SaleReturn.query.get(return_id)
        if not sr:
            return jsonify({'error': 'Sale Return record not found.'}), 404

        # Delete related items
        if hasattr(sr, 'items') and sr.items:
            for item in list(sr.items):
                db.session.delete(item)

        db.session.delete(sr)
        db.session.commit()

        return jsonify({'success': True, 'message': f'Sale Return #{sr.return_number} permanently deleted'}), 200

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
