from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv
from decouple import config

load_dotenv()

# MongoDB configuration
MONGODB_URL = config('MONGODB_URL', default='mongodb://localhost:27017')
DATABASE_NAME = config('DATABASE_NAME', default='icu_monitor')

# Global variables
client = None
database = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, database
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        database = client[DATABASE_NAME]
        # Test the connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
    except ConnectionFailure as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("✅ MongoDB connection closed")

def get_database():
    """Get database instance"""
    if database is None:
        raise ConnectionError("Database not initialized. Call connect_to_mongo() first.")
    return database

def get_client():
    """Get MongoDB client instance"""
    if client is None:
        raise ConnectionError("Client not initialized. Call connect_to_mongo() first.")
    return client
