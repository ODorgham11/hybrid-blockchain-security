"""
database.py — SQLite persistence layer for Aegis OS backend.
Stores all AI decisions, system actions, security alerts, claim analyses,
and daily summaries. Persists independently from the Hardhat node.
"""
import sqlite3
import time
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "aegis.db"

RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}

# ── Schema ──────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS ai_decisions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id         INTEGER,
    agent_name       TEXT    NOT NULL,
    instruction      TEXT,
    context          TEXT,
    reasoning        TEXT,
    action_taken     TEXT,
    risk_level       TEXT,
    claim_id         INTEGER,
    onchain_entry_id INTEGER,
    timestamp        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS security_alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_text  TEXT    NOT NULL,
    context     TEXT,
    status      TEXT    DEFAULT 'RECEIVED',
    decision_id INTEGER REFERENCES ai_decisions(id),
    timestamp   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS system_actions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type  TEXT    NOT NULL,
    target       TEXT,
    description  TEXT,
    triggered_by TEXT,
    status       TEXT    DEFAULT 'SUCCESS',
    decision_id  INTEGER REFERENCES ai_decisions(id),
    timestamp    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS claim_analyses (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id       INTEGER UNIQUE NOT NULL,
    fraud_score    INTEGER,
    reasoning      TEXT,
    recommendation TEXT,
    timestamp      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_summaries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    day_index       INTEGER,
    total_actions   INTEGER DEFAULT 0,
    high_risk_count INTEGER DEFAULT 0,
    avg_risk_level  REAL    DEFAULT 0.0,
    report_hash     TEXT,
    notarized       INTEGER DEFAULT 0,
    timestamp       INTEGER NOT NULL
);
"""

# ── Connection ───────────────────────────────────────────────────────────

def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create all tables if they don't exist. Safe to call multiple times."""
    with _get_conn() as conn:
        conn.executescript(SCHEMA)
    print(f"[Database] Initialized at {DB_PATH}")


# ── Insert Operations ────────────────────────────────────────────────────

def insert_ai_decision(agent_name: str, instruction: str, context: str,
                       reasoning: str, action_taken: str, risk_level,
                       event_id: int = None, claim_id: int = None,
                       onchain_entry_id: int = None) -> int:
    """Insert a full AI decision record. Returns the new row id."""
    if isinstance(risk_level, int):
        risk_level = RISK_LABELS.get(risk_level, str(risk_level))
    with _get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO ai_decisions
               (event_id, agent_name, instruction, context, reasoning,
                action_taken, risk_level, claim_id, onchain_entry_id, timestamp)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (event_id, agent_name, instruction, context, reasoning,
             action_taken, risk_level, claim_id, onchain_entry_id, int(time.time()))
        )
        return cur.lastrowid


def insert_security_alert(alert_text: str, context: str = "",
                          status: str = "RECEIVED", decision_id: int = None) -> int:
    """Log an incoming raw security alert."""
    with _get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO security_alerts (alert_text, context, status, decision_id, timestamp)
               VALUES (?,?,?,?,?)""",
            (alert_text, context, status, decision_id, int(time.time()))
        )
        return cur.lastrowid


def insert_system_action(action_type: str, target: str = "", description: str = "",
                         triggered_by: str = "System", status: str = "SUCCESS",
                         decision_id: int = None) -> int:
    """Log a granular system action (firewall, block, quarantine, etc.)."""
    with _get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO system_actions
               (action_type, target, description, triggered_by, status, decision_id, timestamp)
               VALUES (?,?,?,?,?,?,?)""",
            (action_type, target, description, triggered_by, status, decision_id, int(time.time()))
        )
        return cur.lastrowid


def insert_claim_analysis(claim_id: int, fraud_score: int,
                          reasoning: str, recommendation: str):
    """Upsert a fraud analysis result for a claim."""
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO claim_analyses
               (claim_id, fraud_score, reasoning, recommendation, timestamp)
               VALUES (?,?,?,?,?)
               ON CONFLICT(claim_id) DO UPDATE SET
                 fraud_score=excluded.fraud_score,
                 reasoning=excluded.reasoning,
                 recommendation=excluded.recommendation,
                 timestamp=excluded.timestamp""",
            (claim_id, fraud_score, reasoning, recommendation, int(time.time()))
        )


def insert_daily_summary(day_index: int, total_actions: int, high_risk_count: int,
                         avg_risk_level: float, report_hash: str, notarized: bool = False):
    """Store a daily summary before/after notarization."""
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO daily_summaries
               (day_index, total_actions, high_risk_count, avg_risk_level,
                report_hash, notarized, timestamp)
               VALUES (?,?,?,?,?,?,?)""",
            (day_index, total_actions, high_risk_count, avg_risk_level,
             report_hash, 1 if notarized else 0, int(time.time()))
        )


# ── Read Operations ──────────────────────────────────────────────────────

def get_activity_feed(limit: int = 100) -> list[dict]:
    """Return all system_actions merged with their ai_decision context, newest first."""
    with _get_conn() as conn:
        rows = conn.execute(
            """SELECT
                 sa.id, sa.action_type, sa.target, sa.description,
                 sa.triggered_by, sa.status, sa.timestamp,
                 ad.agent_name, ad.reasoning, ad.risk_level, ad.claim_id
               FROM system_actions sa
               LEFT JOIN ai_decisions ad ON sa.decision_id = ad.id
               ORDER BY sa.timestamp DESC
               LIMIT ?""",
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_ai_decisions(limit: int = 50) -> list[dict]:
    """Return recent AI decisions with full reasoning text."""
    with _get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM ai_decisions ORDER BY timestamp DESC LIMIT ?""",
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_claim_analysis(claim_id: int) -> dict | None:
    """Return fraud analysis for a specific claim."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM claim_analyses WHERE claim_id=?", (claim_id,)
        ).fetchone()
        return dict(row) if row else None


def get_recent_alerts(limit: int = 20) -> list[dict]:
    """Return recent security alerts."""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM security_alerts ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_system_stats() -> dict:
    """Return aggregate stats for the Admin Dashboard stat card."""
    with _get_conn() as conn:
        total_actions = conn.execute("SELECT COUNT(*) FROM system_actions").fetchone()[0]
        agent_counts = conn.execute(
            "SELECT agent_name, COUNT(*) as cnt FROM ai_decisions GROUP BY agent_name"
        ).fetchall()
        last_notarization = conn.execute(
            "SELECT timestamp FROM system_actions WHERE action_type='NOTARIZATION' ORDER BY timestamp DESC LIMIT 1"
        ).fetchone()
        return {
            "total_actions": total_actions,
            "agent_breakdown": {r["agent_name"]: r["cnt"] for r in agent_counts},
            "last_notarization": last_notarization["timestamp"] if last_notarization else None
        }
