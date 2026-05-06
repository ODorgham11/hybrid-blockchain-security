import os
import subprocess

def generate_tree(dir_path, prefix=""):
    exclude = {'.venv', 'node_modules', '.git', '__pycache__', '.pytest_cache', 'cache', 'artifacts'}
    try:
        entries = sorted(os.listdir(dir_path))
    except Exception:
        return ""
    
    entries = [e for e in entries if e not in exclude]
    tree_str = ""
    for i, entry in enumerate(entries):
        is_last = (i == len(entries) - 1)
        connector = "└── " if is_last else "├── "
        tree_str += f"{prefix}{connector}{entry}\n"
        
        full_path = os.path.join(dir_path, entry)
        if os.path.isdir(full_path):
            extension = "    " if is_last else "│   "
            tree_str += generate_tree(full_path, prefix=prefix+extension)
    return tree_str

def read_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

def main():
    # Detect current directory
    root_dir = os.path.dirname(os.path.abspath(__file__))
    output = []
    
    output.append("# Project Code Review Snapshot\n")
    output.append(f"Generated on: {subprocess.check_output(['date', '/t'], shell=True).decode().strip()}\n\n")
    
    output.append("## 1. Directory Structure\n```text\n")
    output.append(f"Hybrid_Blockchain_Project\n")
    output.append(generate_tree(root_dir))
    output.append("```\n")
    
    output.append("## 2. Python Packages (pip freeze)\n```text\n")
    # Check for venv in root or backend
    pip_cmd = os.path.join(root_dir, ".venv", "Scripts", "pip.exe")
    if not os.path.exists(pip_cmd):
        pip_cmd = os.path.join(root_dir, "backend", ".venv", "Scripts", "pip.exe")
    
    if os.path.exists(pip_cmd):
        res = subprocess.run([pip_cmd, "freeze"], capture_output=True, text=True)
        output.append(res.stdout)
    else:
        output.append("pip command not found in .venv.")
    output.append("```\n")
    
    output.append("## 3. Dependencies\n")
    pkg1 = os.path.join(root_dir, "package.json")
    if os.path.exists(pkg1):
        output.append(f"### Root `package.json`\n```json\n{read_file(pkg1)}\n```\n")
        
    reqs = os.path.join(root_dir, "backend", "requirements.txt")
    if os.path.exists(reqs):
        output.append(f"### Backend `requirements.txt`\n```text\n{read_file(reqs)}\n```\n")
        
    pkg2 = os.path.join(root_dir, "frontend", "package.json")
    if os.path.exists(pkg2):
        output.append(f"### Frontend `frontend/package.json`\n```json\n{read_file(pkg2)}\n```\n")
        
    output.append("## 4. Smart Contracts (`contracts/*.sol`)\n")
    contracts_dir = os.path.join(root_dir, "contracts")
    if os.path.exists(contracts_dir):
        for f in sorted(os.listdir(contracts_dir)):
            if f.endswith('.sol'):
                path = os.path.join(contracts_dir, f)
                output.append(f"### `{f}`\n```solidity\n{read_file(path)}\n```\n")
                
    output.append("## 5. Python Backend (`backend/*.py`)\n")
    # Dynamically find all python files in backend
    backend_dir = os.path.join(root_dir, "backend")
    if os.path.exists(backend_dir):
        for root, dirs, files in os.walk(backend_dir):
            if "__pycache__" in dirs: dirs.remove("__pycache__")
            if ".venv" in dirs: dirs.remove(".venv")
            for f in sorted(files):
                if f.endswith('.py'):
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, root_dir).replace(os.sep, "/")
                    output.append(f"### `{rel_path}`\n```python\n{read_file(full_path)}\n```\n")
            
    output.append("## 6. Hardhat Configuration\n")
    hh_config = os.path.join(root_dir, "hardhat.config.js")
    if os.path.exists(hh_config):
        output.append(f"### `hardhat.config.js`\n```javascript\n{read_file(hh_config)}\n```\n")
        
    snapshot_path = os.path.join(root_dir, "snapshot.md")
    with open(snapshot_path, "w", encoding='utf-8') as f:
        f.write("".join(output))
    
    print(f"Snapshot updated successfully at: {snapshot_path}")

if __name__ == "__main__":
    main()
