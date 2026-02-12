import os
from pathlib import Path

import psycopg
from psycopg_pool import ConnectionPool
from pgvector.psycopg import register_vector

DATABASE_URL = os.getenv("DATABASE_URL", "")

_pool: ConnectionPool | None = None


def init_db() -> None:
    global _pool
    if _pool is not None:
        return
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    _pool = ConnectionPool(conninfo=DATABASE_URL, min_size=1, max_size=10, open=True)
    with _pool.connection() as conn:
        register_vector(conn)
    _run_schema_if_needed()


def get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool


def _run_schema_if_needed() -> None:
    pool = get_pool()
    with pool.connection() as conn:
        conn.execute("SELECT 1")
        exists = conn.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'sites'
            )
            """
        ).fetchone()[0]
        if exists:
            return
        schema_path = Path(__file__).with_name("schema.sql")
        schema_sql = schema_path.read_text()
        conn.execute(schema_sql)
        conn.commit()


def get_conn() -> psycopg.Connection:
    return get_pool().connection()
