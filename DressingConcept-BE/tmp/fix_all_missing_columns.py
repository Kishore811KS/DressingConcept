
import pymysql
import os

try:
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='jaikeerthi07a',
        database='m3cars'
    )
    cursor = connection.cursor()
    
    # Check current columns in MySQL
    cursor.execute("SHOW COLUMNS FROM employees")
    columns = [col[0] for col in cursor.fetchall()]
    
    print(f"Current columns in employees: {columns}")
    
    cols_to_add = [
        ('password_hash', 'VARCHAR(200)'),
        ('current_company', 'VARCHAR(200)'),
        ('company_id', 'INT')
    ]
    
    for col_name, col_type in cols_to_add:
        if col_name not in columns:
            print(f"Adding {col_name} to employees...")
            cursor.execute(f"ALTER TABLE employees ADD COLUMN {col_name} {col_type}")
            connection.commit()
            print(f"Column {col_name} added.")
        else:
            print(f"Column {col_name} already exists.")
            
    cursor.close()
    connection.close()
    print("Database columns verification/fix complete.")
except Exception as e:
    print(f"Error: {e}")
    exit(1)
