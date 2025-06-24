# app/utils/run_migrations.py

import os
from alembic.config import Config
from alembic import command

def run_migrations():
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "../../alembic.ini"))
    command.upgrade(alembic_cfg, "head")
