import os
import json
import time
import asyncio
import hashlib
import logging
from datetime import datetime
from pathlib import Path
import hasher
import blockchain
import database

# Module level lock for sequence integrity
# Single worker only — see startup constraint
sequence_lock = asyncio.Lock()

class Notarizer:
    def __init__(self, queue: asyncio.Queue, audit_log_dir: str = "backend/audit_log"):
        self.queue = queue
        self.audit_log_dir = Path(audit_log_dir)
        self.audit_log_dir.mkdir(parents=True, exist_ok=True)
        self._task: asyncio.Task | None = None

        self.sequence_file = self.audit_log_dir / "sequence.json"
        self.gap_alerts_file = self.audit_log_dir / "gap_alerts.json"

        self.last_event_id = self._load_last_id()
        self.last_committed_batch_timestamp = 0
        self.gap_detected = False
        self.gap_count = 0

    def _load_last_id(self) -> int:
        if self.sequence_file.exists():
            try:
                with open(self.sequence_file, "r") as f:
                    return json.load(f).get("last_event_id", -1)
            except Exception:
                pass
        return -1

    def _save_last_id(self, event_id: int):
        temp_file = self.sequence_file.with_suffix(".tmp")
        data = {"last_event_id": event_id, "updated_at": int(time.time())}
        with open(temp_file, "w") as f:
            json.dump(data, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_file, self.sequence_file)

    async def get_next_id(self) -> int:
        async with sequence_lock:
            self.last_event_id += 1
            self._save_last_id(self.last_event_id)
            return self.last_event_id

    def start(self):
        """Launch the background notarization loop as an asyncio task."""
        self._task = asyncio.create_task(self._loop())
        print("[Notarizer] Background service started (asyncio loop, 60s interval).")

    async def _loop(self):
        """Run run_batch every 60 seconds indefinitely."""
        while True:
            await asyncio.sleep(60)
            try:
                await self.run_batch()
            except Exception as e:
                logging.getLogger("Notarizer").error(f"Batch error: {e}")

    async def run_batch(self):
        # Fix 4: Job is async def and awaited by AsyncIOScheduler
        events = []
        while not self.queue.empty():
            events.append(await self.queue.get())

        if not events:
            return

        events.sort(key=lambda x: x['event_id'])
        
        # Gap Detection
        batch_ids = [e['event_id'] for e in events]
        for i in range(len(batch_ids) - 1):
            if batch_ids[i+1] != batch_ids[i] + 1:
                self._log_gap(batch_ids[i] + 1, batch_ids[i+1], len(events))

        # Fix 8: Second-preimage protection with Domain Separation
        event_hashes = []
        for event in events:
            payload = (
                f"{event['event_id']}"
                f"{event['instruction_hash']}"
                f"{event['context_hash']}"
                f"{event['reasoning_hash']}"
                f"{event['action_hash']}"
                f"{event['risk_level']}"
                f"{event['timestamp']}"
                f"{event['agent_name']}"
            )
            # Leaf: sha256(0x00 + data)
            event_hash = "0x" + hashlib.sha256(b"\x00" + payload.encode()).hexdigest()
            event['event_hash'] = event_hash 
            event_hashes.append(event_hash)

        merkle_root = self._build_merkle_root(event_hashes)
        
        try:
            batch_id = blockchain.record_batch_root(merkle_root)
            self.last_committed_batch_timestamp = int(time.time())
        except Exception as e:
            batch_id = -1

        timestamp = int(time.time())
        batch_data = {
            "batch_id": batch_id,
            "merkle_root": merkle_root,
            "timestamp": timestamp,
            "event_count": len(events),
            "events": events
        }
        
        file_path = self.audit_log_dir / f"batch_{timestamp}.json"
        with open(file_path, "w") as f:
            json.dump(batch_data, f, indent=4)

        # Persist notarization action to DB
        status = "SUCCESS" if batch_id >= 0 else "FAILED"
        database.insert_system_action(
            action_type="NOTARIZATION",
            target=f"Batch of {len(events)} events",
            description=f"Merkle root committed: {merkle_root[:18]}... (batch_id={batch_id})",
            triggered_by="Notarizer",
            status=status
        )

    def _build_merkle_root(self, leaves: list[str]) -> str:
        if not leaves:
            return "0x" + hashlib.sha256(b"\x00").hexdigest()

        # Convert hex to raw bytes
        current_level = [bytes.fromhex(l.replace('0x', '')) for l in leaves]

        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                # Node: sha256(0x01 + left + right)
                next_level.append(hashlib.sha256(b"\x01" + left + right).digest())
            current_level = next_level

        return "0x" + current_level[0].hex()

    def _log_gap(self, expected_id: int, found_id: int, batch_size: int):
        self.gap_detected = True
        self.gap_count += 1
        alert = {"expected": expected_id, "found": found_id, "ts": int(time.time()), "size": batch_size}
        
        alerts = []
        if self.gap_alerts_file.exists():
            try:
                with open(self.gap_alerts_file, "r") as f: alerts = json.load(f)
            except Exception: pass
        alerts.append(alert)
        
        temp_file = self.gap_alerts_file.with_suffix(".tmp")
        with open(temp_file, "w") as f: json.dump(alerts, f, indent=4)
        os.replace(temp_file, self.gap_alerts_file)

    def get_sequence_status(self) -> dict:
        return {
            "last_committed_event_id": self.last_event_id,
            "last_committed_batch_timestamp": self.last_committed_batch_timestamp,
            "any_gaps_detected": self.gap_detected,
            "gap_count": self.gap_count
        }

    def get_event_proof(self, event_hash: str):
        for log_file in sorted(self.audit_log_dir.glob("batch_*.json"), reverse=True):
            with open(log_file, "r") as f:
                batch = json.load(f)
            hashes = [e["event_hash"] for e in batch["events"]]
            if event_hash in hashes:
                index = hashes.index(event_hash)
                proof = self._calculate_merkle_proof(hashes, index)
                return {"event": batch["events"][index], "merkle_root": batch["merkle_root"], "proof": proof}
        return None

    def _calculate_merkle_proof(self, leaves: list[str], index: int) -> list[dict]:
        proof = []
        current_level = [bytes.fromhex(l.replace('0x', '')) for l in leaves]
        curr_idx = index
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                if i == curr_idx or i + 1 == curr_idx:
                    sibling = right if i == curr_idx else left
                    direction = "right" if i == curr_idx else "left"
                    proof.append({"hash": "0x" + sibling.hex(), "direction": direction})
                next_level.append(hashlib.sha256(b"\x01" + left + right).digest())
            current_level = next_level
            curr_idx //= 2
        return proof
