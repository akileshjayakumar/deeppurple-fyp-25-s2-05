"""
Simple script to add the user_tier column to the users table.
"""

from sqlalchemy import text
from core.database import engine


def add_user_tier_column():
    """Add user_tier column to users table if it doesn't exist."""
    with engine.connect() as conn:
        # Start a new transaction
        with conn.begin():
            try:
                # Use information_schema to check if column exists
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='user_tier';
                """))

                if result.fetchone():
                    print("user_tier column already exists")
                else:
                    # Add the column
                    print("Adding user_tier column...")
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN user_tier VARCHAR(50) NOT NULL DEFAULT 'basic'"))
                    print("Column added successfully")
            except Exception as e:
                print(f"Error: {str(e)}")
                raise


if __name__ == "__main__":
    add_user_tier_column()
