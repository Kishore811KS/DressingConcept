
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
    
    if result:
        print("Dropping manual password_hash column to let migration handle it...")
        cursor.execute("ALTER TABLE employees DROP COLUMN password_hash")
        connection.commit()
        print("Column dropped successfully.")
    else:
        print("Column password_hash does not exist.")
        
    cursor.close()
    connection.close()
except Exception as e:
    print(f"Error: {e}")
    exit(1)
