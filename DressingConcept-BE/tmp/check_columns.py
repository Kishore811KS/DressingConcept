
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
    
    cursor.execute("DESCRIBE employees")
    columns = cursor.fetchall()
    for col in columns:
        print(col)
        
    cursor.close()
    connection.close()
except Exception as e:
    print(f"Error: {e}")
    exit(1)
