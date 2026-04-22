import pymysql

# Database connection details
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'jaikeerthi07a',
    'database': 'm3cars'
}

def create_enquiries_table():
    try:
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Create enquiries table
        create_table_query = """
        CREATE TABLE IF NOT EXISTS enquiries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(200) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            email VARCHAR(150),
            age INT,
            meetup_date DATE NOT NULL,
            is_coming_today BOOLEAN DEFAULT FALSE,
            car_interest VARCHAR(200),
            notes TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            called BOOLEAN DEFAULT FALSE,
            next_followup_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        cursor.execute(create_table_query)
        connection.commit()
        print("Table 'enquiries' created successfully or already exists.")

    except Exception as e:
        print(f"Error creating table: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            cursor.close()
            connection.close()

if __name__ == "__main__":
    create_enquiries_table()
