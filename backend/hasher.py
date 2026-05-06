import hashlib
import json

def sha256(data: str) -> str:
    """Returns the SHA-256 hash of a string as a hex string."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def sha256_bytes(data: bytes) -> str:
    """Returns the SHA-256 hash of bytes as a hex string."""
    return hashlib.sha256(data).hexdigest()

def to_bytes32(hex_str: str) -> bytes:
    """Converts a hex string (with or without '0x') to a 32-byte representation."""
    if hex_str.startswith('0x'):
        hex_str = hex_str[2:]
    return bytes.fromhex(hex_str)

def build_merkle_root(leaves: list[str]) -> str:
    """
    Builds a simple Merkle Tree root from a list of hex string hashes.
    If the number of leaves is odd, the last leaf is duplicated to balance the tree.
    """
    if not leaves:
        return sha256("")

    # Convert leaves to bytes for hashing
    current_level = [bytes.fromhex(leaf.replace('0x', '')) for leaf in leaves]

    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            left = current_level[i]
            # If there's no right child, duplicate the left child
            right = current_level[i + 1] if i + 1 < len(current_level) else left
            
            # Hash the concatenated pair
            combined = left + right
            next_level.append(hashlib.sha256(combined).digest())
            
        current_level = next_level

    return "0x" + current_level[0].hex()
