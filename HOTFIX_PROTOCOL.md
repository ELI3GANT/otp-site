# 🔥 HOTFIX PROTOCOL

**Objective:** Rapidly resolve critical production issues without disrupting ongoing feature development.

## ⚡ Quick Start
Run the automated script to prepare your environment:
```bash
./scripts/start_hotfix.sh
```

## 📝 Manual Workflow

1.  **Identify the Base:**
    Hotfixes must branch from the latest **stable release tag** (e.g., `v1.0.0`), *not* the current `main` branch (which may contain unverified features).

    ```bash
    git checkout v1.0.0
    git checkout -b hotfix-v1.0.1
    ```

2.  **Apply Fix:**
    Implement the minimal necessary changes. Avoid refactoring.

3.  **Verify:**
    Run the critical test suite:
    ```bash
    node tests/full_system_test.js
    ```

4.  **Deploy:**
    Merge back to `main` and tag.
    ```bash
    git checkout main
    git merge hotfix-v1.0.1
    git tag v1.0.1
    git push origin main --tags
    ```
