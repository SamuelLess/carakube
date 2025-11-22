"""
Simple autofix module with placeholder vulnerability fixing function.
"""

import subprocess
import tempfile
import shutil
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple
import google.generativeai as genai

from .git_operations import commit_and_push_changes, create_pull_request


REPO_URL = "https://github.com/SamuelLess/hackatum-k8s-flux.git"


def clone_repo() -> Path:
    """
    Clone the repository into a temporary folder with timestamp.
    
    Returns:
        Path to the cloned repository
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    tmp_base = Path(tempfile.gettempdir())
    repo_dir = tmp_base / f"hackatum-k8s-flux_{timestamp}"
    
    try:
        subprocess.run(
            ["git", "clone", REPO_URL, str(repo_dir)],
            check=True,
            capture_output=True,
            text=True
        )
        return repo_dir
    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to clone repository:\nCommand: git clone {REPO_URL} {repo_dir}\nReturn code: {e.returncode}\nStdout: {e.stdout}\nStderr: {e.stderr}"
        raise RuntimeError(error_msg) from e


def cleanup_repo(repo_dir: Path) -> None:
    """
    Clean up the cloned repository directory.
    
    Args:
        repo_dir: Path to the repository directory to remove
    """
    if repo_dir.exists():
        shutil.rmtree(repo_dir)


def collect_small_files(repo_dir: Path, max_size_kb: int = 5) -> List[Tuple[str, str]]:
    """
    Recursively collect all files smaller than max_size_kb from the repository.
    
    Args:
        repo_dir: Path to the repository directory
        max_size_kb: Maximum file size in KB (default: 5)
        
    Returns:
        List of tuples containing (relative_path, file_content)
    """
    collected_files = []
    max_size_bytes = max_size_kb * 1024
    
    # Skip common directories that should be ignored
    skip_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', '.pytest_cache'}
    
    for root, dirs, files in os.walk(repo_dir):
        # Remove skip_dirs from dirs in-place to prevent os.walk from entering them
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            file_path = Path(root) / file
            try:
                # Check file size
                if file_path.stat().st_size <= max_size_bytes:
                    # Try to read as text
                    try:
                        content = file_path.read_text(encoding='utf-8')
                        relative_path = file_path.relative_to(repo_dir)
                        collected_files.append((str(relative_path), content))
                    except (UnicodeDecodeError, PermissionError):
                        # Skip binary files or files we can't read
                        pass
            except (OSError, PermissionError):
                # Skip files we can't access
                pass
    
    return collected_files


def build_context_string(files: List[Tuple[str, str]]) -> str:
    """
    Build a context string from collected files with file paths.
    
    Args:
        files: List of tuples containing (relative_path, file_content)
        
    Returns:
        Formatted context string
    """
    context_parts = []
    for file_path, content in files:
        context_parts.append(f"=== FILE: {file_path} ===")
        context_parts.append(content)
        context_parts.append("")  # Empty line between files
    
    return "\n".join(context_parts)


def call_gemini_for_patch(context: str, vulnerability: Dict[str, Any], node_info: Dict[str, Any]) -> str:
    """
    Call Gemini 2.0 Flash API to generate a patch file for the vulnerability.
    
    Args:
        context: The concatenated file context
        vulnerability: The vulnerability data
        node_info: Information about the node where the vulnerability was found
        
    Returns:
        Generated patch file content
    """
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
    # Build the prompt
    vulnerability_info = json.dumps(vulnerability, indent=2)
    node_info_str = json.dumps(node_info, indent=2) if node_info else "N/A"
    
    prompt = f"""You are a security expert tasked with fixing vulnerabilities in Kubernetes manifests.

VULNERABILITY INFORMATION:
{vulnerability_info}

NODE INFORMATION:
{node_info_str}

REPOSITORY FILES (files < 5KB):
{context}

TASK:
Analyze the vulnerability and the repository files, then generate a unified diff patch file that fixes the vulnerability.
The patch should follow the standard unified diff format that can be applied with the 'patch' command.

REQUIREMENTS:
1. Generate ONLY the patch file content - no explanations or markdown formatting
2. Use unified diff format (--- and +++ headers, @@ hunks)
3. Make minimal changes necessary to fix the vulnerability
4. Ensure the patch is syntactically correct and can be applied
5. If the vulnerability involves image versions, security contexts, resource limits, or similar Kubernetes configurations, update them appropriately
6. Start your response with the patch content directly

Generate the patch now:"""

    # Call Gemini API
    response = model.generate_content(prompt)
    
    return response.text


def apply_patch(repo_dir: Path, patch_content: str) -> None:
    """
    Apply a patch file to the repository.
    
    Args:
        repo_dir: Path to the repository directory
        patch_content: The patch file content to apply
    """
    # Write patch to temporary file
    patch_file = repo_dir / "autofix.patch"
    patch_file.write_text(patch_content)
    
    try:
        # Apply the patch
        result = subprocess.run(
            ["patch", "-p1", "-i", str(patch_file)],
            cwd=repo_dir,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"Patch applied successfully: {result.stdout}")
    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to apply patch:\nCommand: patch -p1 -i {patch_file}\nReturn code: {e.returncode}\nStdout: {e.stdout}\nStderr: {e.stderr}\n\nPatch content:\n{patch_content}"
        raise RuntimeError(error_msg) from e
    finally:
        # Clean up patch file
        if patch_file.exists():
            patch_file.unlink()


def fix_vulnerability(vulnerability: Dict[str, Any], node_info: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Fix a vulnerability by using Gemini AI to generate and apply a patch.
    
    Args:
        vulnerability: The vulnerability data from the scan report
        node_info: Information about the node where the vulnerability was found
        
    Returns:
        A dictionary with the fix result
    """
    repo_dir = None
    try:
        print(f"[AUTOFIX] Starting fix process for vulnerability: {vulnerability.get('id', 'unknown')}", flush=True)
        
        # Step 1: Clone the repository
        print("[AUTOFIX] Step 1: Cloning repository...", flush=True)
        repo_dir = clone_repo()
        print(f"[AUTOFIX] Repository cloned to: {repo_dir}", flush=True)
        
        # Step 2: Collect all files < 5KB
        print("[AUTOFIX] Step 2: Collecting files < 5KB...", flush=True)
        files = collect_small_files(repo_dir, max_size_kb=5)
        print(f"[AUTOFIX] Collected {len(files)} files", flush=True)
        
        # Step 3: Build context string
        print("[AUTOFIX] Step 3: Building context string...", flush=True)
        context = build_context_string(files)
        print(f"[AUTOFIX] Context built: {len(context)} characters", flush=True)
        
        # Step 4: Call Gemini to generate patch
        print("[AUTOFIX] Step 4: Calling Gemini API to generate patch...", flush=True)
        patch_content = call_gemini_for_patch(context, vulnerability, node_info)
        print(f"[AUTOFIX] Patch generated: {len(patch_content)} characters", flush=True)
        
        # Step 5: Apply the patch
        print("[AUTOFIX] Step 5: Applying patch...", flush=True)
        apply_patch(repo_dir, patch_content)
        print("[AUTOFIX] Patch applied successfully", flush=True)
        
        # Step 6: Generate branch name and commit message
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        vuln_id = vulnerability.get('id', 'unknown')
        branch_name = f"autofix/{vuln_id}-{timestamp}"
        commit_message = f"Auto-fix: Resolve {vuln_id}\n\nAutomatically generated fix for vulnerability {vuln_id}"
        
        # Step 7: Commit and push changes
        print(f"[AUTOFIX] Step 6: Committing and pushing to branch {branch_name}...", flush=True)
        commit_and_push_changes(repo_dir, branch_name, commit_message)
        print("[AUTOFIX] Changes committed and pushed", flush=True)
        
        # Step 8: Create pull request
        print("[AUTOFIX] Step 7: Creating pull request...", flush=True)
        pr_title = f"Auto-fix: Resolve {vuln_id}"
        pr_body = f"""## Automated Security Fix

**Vulnerability ID:** {vuln_id}
**Severity:** {vulnerability.get('severity', 'N/A')}

### Vulnerability Details
```json
{json.dumps(vulnerability, indent=2)}
```

### Node Information
```json
{json.dumps(node_info, indent=2) if node_info else 'N/A'}
```

### Fix Description
This pull request was automatically generated by Carakube's auto-fix system using AI-powered analysis.
The patch was generated by analyzing the vulnerability and the repository files to produce a minimal fix.

**Generated by:** Carakube Auto-fix System
**Timestamp:** {timestamp}
"""
        
        pr_response = create_pull_request(branch_name, title=pr_title, body=pr_body)
        print(f"[AUTOFIX] Pull request created: #{pr_response['number']}", flush=True)
        
        return {
            "success": True,
            "message": f"Successfully created PR #{pr_response['number']}",
            "vulnerability": vulnerability,
            "node": node_info,
            "repo_path": str(repo_dir),
            "pr_url": pr_response['html_url'],
            "branch": branch_name,
            "files_analyzed": len(files),
            "patch_size": len(patch_content)
        }
    except Exception as e:
        print(f"[AUTOFIX] ERROR: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Failed to fix vulnerability: {str(e)}",
            "vulnerability": vulnerability,
            "node": node_info
        }
    finally:
        if repo_dir:
            print(f"[AUTOFIX] Cleaning up repository at {repo_dir}", flush=True)
            cleanup_repo(repo_dir)
