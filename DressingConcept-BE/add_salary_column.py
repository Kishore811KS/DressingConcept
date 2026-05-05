import pymysql

def add_column():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='root123',
            database='dress'
        )
        with connection.cursor() as cursor:
            # Check if column exists
            cursor.execute("SHOW COLUMNS FROM employees LIKE 'basic_salary'")
            result = cursor.fetchone()
            if not result:
                print("Adding basic_salary column to employees table...")
                cursor.execute("ALTER TABLE employees ADD COLUMN basic_salary FLOAT DEFAULT 0.0")
                connection.commit()
                print("Column added successfully.")
            else:
                print("Column basic_salary already exists.")
        connection.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
