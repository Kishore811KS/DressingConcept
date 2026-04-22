
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
    
    # Check if column exists
    cursor.execute("SHOW COLUMNS FROM employees LIKE 'password_hash'")
    result = cursor.fetchone()
    
    if not result:
        print("Adding password_hash column to employees table...")
        cursor.execute("ALTER TABLE employees ADD COLUMN password_hash VARCHAR(200)")
        connection.commit()
        print("Column added successfully.")
    else:
        print("Column password_hash already exists.")
        
    cursor.close()
    connection.close()
except Exception as e:
    print(f"Error: {e}")
    exit(1)
