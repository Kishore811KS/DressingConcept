from flask import Blueprint, request, jsonify
from app.models.product import Product
from app import db
from sqlalchemy.exc import IntegrityError


product_bp = Blueprint("product_bp", __name__)


# Validation function
def validate_product_data(data):
    errors = []
    
    if not data.get('name'):
        errors.append('Product name is required')
    
    try:
        buy_price = float(data.get('buyPrice', 0))
        if buy_price < 0:
            errors.append('Buy price cannot be negative')
    except (TypeError, ValueError):
        errors.append('Invalid buy price')
    
    try:
        sell_price = float(data.get('sellPrice', 0))
        if sell_price < 0:
            errors.append('Sell price cannot be negative')
    except (TypeError, ValueError):
        errors.append('Invalid sell price')
    
    try:
        quantity = int(data.get('quantity', 0))
        if quantity < 0:
            errors.append('Quantity cannot be negative')
    except (TypeError, ValueError):
        errors.append('Invalid quantity')
    
    return errors


# ------------------ CREATE PRODUCT ------------------
@product_bp.route("/products", methods=["POST"])
def create_product():
    try:
        data = request.get_json()
        
        # Validate input
        errors = validate_product_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        # Handle watts properly
        watts = None
        if data.get('watts'):
            try:
                watts = float(data['watts'])
            except (TypeError, ValueError):
                watts = data['watts']  # Keep as string if not float

        product = Product(
            product_code=data.get("productCode", "").strip(),
            name=data.get("name", "").strip(),
            description=data.get("description", "").strip(),
            model=data.get("model", "").strip(),
            unit=data.get("unit", "PCS").strip() or "PCS",
            tax=float(data.get("tax", 0) or 0),
            mrp=float(data.get("mrp", data.get("buyPrice", 0)) or 0),
            discount_percent=float(data.get("discountPercent", 0) or 0),
            net_price=float(data.get("netPrice", 0) or 0),
            sales_person=data.get("salesPerson", "").strip(),
            classic_customer=float(data.get("classicCustomer", 0) or 0),
            type=data.get("type", "").strip(),
            watts=watts,
            buy_price=float(data.get("buyPrice", 0)),
            sell_price=float(data.get("sellPrice", 0)),
            quantity=int(data.get("quantity", 0)),  # Changed to int
        )

        product.calculate_values()

        db.session.add(product)
        db.session.commit()

        return jsonify(product.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


# ------------------ GET ALL PRODUCTS ------------------
@product_bp.route("/products", methods=["GET"])
def get_products():
    try:
        # Add pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Add filtering
        product_type = request.args.get('type')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        
        query = Product.query.filter(~Product.name.startswith("___DELETED___"))
        
        if product_type:
            query = query.filter_by(type=product_type)
        if min_price is not None:
            query = query.filter(Product.sell_price >= min_price)
        if max_price is not None:
            query = query.filter(Product.sell_price <= max_price)
        
        # Paginate results
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'items': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ------------------ GET SINGLE PRODUCT ------------------
@product_bp.route("/products/<int:id>", methods=["GET"])
def get_product(id):
    try:
        product = Product.query.get_or_404(id)
        return jsonify(product.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ------------------ UPDATE PRODUCT ------------------
@product_bp.route("/products/<int:id>", methods=["PUT"])
def update_product(id):
    try:
        product = Product.query.get_or_404(id)
        data = request.get_json()
        
        # Validate input for updated fields
        if data.get('buyPrice') or data.get('sellPrice') or data.get('quantity'):
            errors = validate_product_data(data)
            if errors:
                return jsonify({"errors": errors}), 400

        # Update only provided fields
        if data.get('name') is not None:
            product.name = data['name'].strip()
        if data.get('productCode') is not None:
            product.product_code = data['productCode'].strip()
        if data.get('description') is not None:
            product.description = data['description'].strip()
        if data.get('model') is not None:
            product.model = data['model'].strip()
        if data.get('unit') is not None:
            product.unit = data['unit'].strip() or "PCS"
        if data.get('tax') is not None:
            product.tax = float(data['tax'] or 0)
        if data.get('mrp') is not None:
            product.mrp = float(data['mrp'] or 0)
        if data.get('discountPercent') is not None:
            product.discount_percent = float(data['discountPercent'] or 0)
        if data.get('netPrice') is not None:
            product.net_price = float(data['netPrice'] or 0)
        if data.get('salesPerson') is not None:
            product.sales_person = data['salesPerson'].strip()
        if data.get('classicCustomer') is not None:
            product.classic_customer = float(data['classicCustomer'] or 0)
        if data.get('type') is not None:
            product.type = data['type'].strip()
        if data.get('watts') is not None:
            try:
                product.watts = float(data['watts'])
            except (TypeError, ValueError):
                product.watts = data['watts']
        if data.get('buyPrice') is not None:
            product.buy_price = float(data['buyPrice'])
        if data.get('sellPrice') is not None:
            product.sell_price = float(data['sellPrice'])
        if data.get('quantity') is not None:
            product.quantity = int(data['quantity'])

        product.calculate_values()

        db.session.commit()

        return jsonify(product.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


# ------------------ DELETE PRODUCT ------------------
@product_bp.route("/products/<int:id>", methods=["DELETE"])
def delete_product(id):
    try:
        product = Product.query.get_or_404(id)

        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Product deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        # If it throws a constraint error, we use a Soft Delete strategy
        # by hiding the product from the UI instead of deleting its bill history!
        if 'IntegrityError' in str(e) or 'foreign key constraint' in str(e) or 'constraint' in str(e).lower():
            try:
                if not product.name.startswith("___DELETED___"):
                    product.name = f"___DELETED___{product.name}"
                    product.product_code = f"DEL-{product.id}"
                    product.quantity = 0
                    db.session.commit()
                return jsonify({"message": "Product successfully deleted (archived to preserve bill history)."}), 200
            except Exception as inner_e:
                db.session.rollback()
                return jsonify({"error": str(inner_e)}), 400
                
        return jsonify({"error": str(e)}), 400


# ------------------ BULK CREATE PRODUCTS ------------------
@product_bp.route("/products/bulk", methods=["POST"])
def bulk_create_products():
    try:
        data = request.get_json()
        products = data.get('products', [])
        
        if not products:
            return jsonify({"error": "No products provided"}), 400
        
        created_products = []
        errors = []
        
        for idx, product_data in enumerate(products):
            try:
                # Validate each product
                validation_errors = validate_product_data(product_data)
                if validation_errors:
                    errors.append({
                        'index': idx,
                        'errors': validation_errors,
                        'data': product_data
                    })
                    continue
                
                # Create product
                product = Product(
                    product_code=product_data.get("productCode", "").strip(),
                    name=product_data.get("name", "").strip(),
                    description=product_data.get("description", "").strip(),
                    model=product_data.get("model", "").strip(),
                    unit=product_data.get("unit", "PCS").strip() or "PCS",
                    tax=float(product_data.get("tax", 0) or 0),
                    mrp=float(product_data.get("mrp", product_data.get("buyPrice", 0)) or 0),
                    discount_percent=float(product_data.get("discountPercent", 0) or 0),
                    net_price=float(product_data.get("netPrice", 0) or 0),
                    sales_person=product_data.get("salesPerson", "").strip(),
                    classic_customer=float(product_data.get("classicCustomer", 0) or 0),
                    type=product_data.get("type", "").strip(),
                    watts=product_data.get("watts"),
                    buy_price=float(product_data.get("buyPrice", 0)),
                    sell_price=float(product_data.get("sellPrice", 0)),
                    quantity=int(product_data.get("quantity", 0)),
                )
                
                product.calculate_values()
                db.session.add(product)
                created_products.append(product)
                
            except Exception as e:
                errors.append({
                    'index': idx,
                    'error': str(e),
                    'data': product_data
                })
        
        if created_products:
            db.session.commit()
        
        return jsonify({
            'created': [p.to_dict() for p in created_products],
            'errors': errors,
            'total_created': len(created_products),
            'total_errors': len(errors)
        }), 201 if created_products else 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


# ------------------ PRODUCT STATISTICS ------------------
@product_bp.route("/products/statistics", methods=["GET"])
def get_product_statistics():
    try:
        from sqlalchemy import func
        
        stats = db.session.query(
            func.count(Product.id).label('total_products'),
            func.sum(Product.quantity).label('total_quantity'),
            func.avg(Product.sell_price).label('avg_sell_price'),
            func.avg(Product.buy_price).label('avg_buy_price'),
            func.sum(Product.amount).label('total_value')
        ).first()
        
        # Get counts by type
        type_counts = db.session.query(
            Product.type,
            func.count(Product.id).label('count')
        ).group_by(Product.type).all()
        
        return jsonify({
            'total_products': stats.total_products or 0,
            'total_quantity': stats.total_quantity or 0,
            'average_sell_price': round(stats.avg_sell_price or 0, 2),
            'average_buy_price': round(stats.avg_buy_price or 0, 2),
            'total_inventory_value': round(stats.total_value or 0, 2),
            'products_by_type': [{'type': t[0] or 'Uncategorized', 'count': t[1]} for t in type_counts]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400
