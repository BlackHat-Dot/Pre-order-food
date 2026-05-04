from sqlmodel import Field, Session, SQLModel, create_engine, select
from db import engine

def create_db_and_tables(): #done
    SQLModel.metadata.create_all(engine)