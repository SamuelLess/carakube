"""
Git operations for the autofix system.
"""

import subprocess
import os
from pathlib import Path
from typing import Dict, Any
import requests


GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "SamuelLess")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "hackatum-k8s-flux")


def create_test_file(repo_dir: Path) -> None:
    """
    Create a test.txt file in the repository.
    
    Args:
        repo_dir: Path to the repository directory
    """
    test_file = repo_dir / "test.txt"
    test_file.write_text("TEST")


def commit_and_push_changes(repo_dir: Path, branch_name: str) -> None:
    """
    Commit changes and push to a new branch.
    
    Args:
        repo_dir: Path to the repository directory
        branch_name: Name of the new branch
    """
    # Configure git user
    subprocess.run(
        ["git", "config", "user.name", "Carakube Bot"],
        cwd=repo_dir,
        check=True,
        capture_output=True
    )
    subprocess.run(
        ["git", "config", "user.email", "bot@carakube.local"],
        cwd=repo_dir,
        check=True,
        capture_output=True
    )
    
    # Create and checkout new branch
    subprocess.run(
        ["git", "checkout", "-b", branch_name],
        cwd=repo_dir,
        check=True,
        capture_output=True
    )
    
    # Add the test file
    subprocess.run(
        ["git", "add", "test.txt"],
        cwd=repo_dir,
        check=True,
        capture_output=True
    )
    
    # Commit the changes
    subprocess.run(
        ["git", "commit", "-m", "Add test file"],
        cwd=repo_dir,
        check=True,
        capture_output=True
    )
    
    # Push to remote with authentication
    remote_url = f"https://{GITHUB_TOKEN}@github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}.git"
    subprocess.run(
        ["git", "push", remote_url, branch_name],
        cwd=repo_dir,
        check=True,
        capture_output=True
    )


def create_pull_request(branch_name: str, base_branch: str = "main") -> Dict[str, Any]:
    """
    Create a pull request on GitHub.
    
    Args:
        branch_name: Name of the branch to create PR from
        base_branch: Name of the base branch (default: main)
        
    Returns:
        API response from GitHub
    """
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/pulls"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "title": f"Auto-fix: Add test file",
        "body": "Automatically generated test file by Carakube auto-fix system.",
        "head": branch_name,
        "base": base_branch
    }
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()
