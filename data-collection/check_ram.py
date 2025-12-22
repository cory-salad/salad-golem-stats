import sqlite3
import os

# Construct the path to the database
db_path = os.path.join(".", "plans.db")
db_path = os.path.abspath(db_path)

conn = sqlite3.connect(db_path)

# List all tables in the database
cursor = conn.cursor()
cursor.execute("SELECT ram FROM node_plan LIMIT 5;")
example_rows = cursor.fetchall()
for row in example_rows:
    print(row)
