# db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://postgres:nXDslfkImWkfmrYsJghJyVQfoRDMPExK@yamabiko.proxy.rlwy.net:38097/railway"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

Base = declarative_base()

# changed the url back to sqlite for simplicity and easy access