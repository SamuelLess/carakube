"""
Simple autofix module with placeholder vulnerability fixing function.
"""

import subprocess
import tempfile
import shutil
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple
import google.generativeai as genai
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from .git_operations import commit_and_push_changes, create_pull_request

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


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


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((Exception,)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def call_gemini_for_patch(context: str, vulnerability: Dict[str, Any], node_info: Dict[str, Any]) -> str:
    """
    Call Gemini 2.0 Flash API to generate a patch file for the vulnerability.
    Retries up to 3 times with exponential backoff.
    Uses structured output to ensure valid patch format.
    
    Args:
        context: The concatenated file context
        vulnerability: The vulnerability data
        node_info: Information about the node where the vulnerability was found
        
    Returns:
        Generated patch file content
        
    Raises:
        ValueError: If API key is not set or patch is invalid
        Exception: If patch generation fails after retries
    """
    logger.info(f"[AUTOFIX] Calling Gemini API for vulnerability: {vulnerability.get('id', 'unknown')}")
    
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Use structured output schema to force valid patch format
    model = genai.GenerativeModel(
        'gemini-2.0-flash-exp',
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "object",
                "properties": {
                    "patch": {
                        "type": "string",
                        "description": "A valid unified diff patch that can be applied with 'patch -p1'. Must start with '---' and contain '+++' and '@@' markers."
                    },
                    "file_path": {
                        "type": "string",
                        "description": "The relative path to the file being patched"
                    },
                    "summary": {
                        "type": "string",
                        "description": "Brief one-line summary of the fix"
                    }
                },
                "required": ["patch", "file_path", "summary"]
            }
        }
    )
    
    # Build the prompt
    vulnerability_info = json.dumps(vulnerability, indent=2)
    node_info_str = json.dumps(node_info, indent=2) if node_info else "N/A"
    
    prompt = f"""You are a security expert fixing Kubernetes vulnerabilities.

VULNERABILITY:
{vulnerability_info}

NODE:
{node_info_str}

REPOSITORY FILES:
{context}

TASK: Generate a unified diff patch to fix this vulnerability.

RULES:
1. Output ONLY valid unified diff format (use --- and +++ headers, @@ hunks)
2. Make MINIMAL changes - only what's needed to fix the vulnerability
3. NO comments, NO explanations - pure patch content only
4. For RBAC wildcards: replace "*" with specific resource names (e.g., "customresourcedefinitions.apiextensions.k8s.io")
5. For resource limits: add CPU/memory limits to containers
6. For security: add runAsNonRoot, capabilities, securityContext
7. Ensure YAML indentation is EXACT and correct

EXAMPLES:
RBAC fix: Change "resources: ['*']" to "resources: ['customresourcedefinitions']"
Limits fix: Add "resources: {{limits: {{cpu: '100m', memory: '128Mi'}}}}"

Generate the patch:"""

    # Call Gemini API
    response = model.generate_content(prompt)
    
    # Parse JSON response
    try:
        result = json.loads(response.text)
        patch_content = result.get("patch", "")
        file_path = result.get("file_path", "unknown")
        summary = result.get("summary", "")
        
        logger.info(f"[AUTOFIX] Received patch for file: {file_path}")
        logger.info(f"[AUTOFIX] Summary: {summary}")
        logger.info(f"[AUTOFIX] Patch size: {len(patch_content)} chars")
    except json.JSONDecodeError as e:
        logger.error(f"[AUTOFIX] Failed to parse structured output: {e}")
        logger.error(f"[AUTOFIX] Raw response: {response.text[:500]}")
        raise ValueError(f"Gemini returned invalid JSON: {e}")
    
    if not patch_content:
        raise ValueError("Gemini returned empty patch")
    
    # Validate and clean patch
    patch_content = patch_content.strip()
    
    logger.info(f"[AUTOFIX] Received patch from Gemini ({len(patch_content)} chars)")
    
    # Validate patch has required components (these checks will now rarely fail due to structured output)
    if not patch_content.startswith("---"):
        logger.error(f"[AUTOFIX] Invalid patch start: {patch_content[:100]}")
        raise ValueError("Generated patch doesn't start with --- (not a valid unified diff)")
    
    if "+++" not in patch_content:
        raise ValueError("Generated patch missing +++ header (not a valid unified diff)")
    
    if "@@" not in patch_content:
        raise ValueError("Generated patch missing @@ hunk markers (not a valid unified diff)")
    
    # Ensure patch ends with newline
    if not patch_content.endswith("\n"):
        patch_content += "\n"
    
    logger.info("[AUTOFIX] Patch validation passed")
    return patch_content


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
