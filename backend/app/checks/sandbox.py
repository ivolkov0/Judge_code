"""Subprocess-based sandbox for algorithmic judge.

Runs untrusted code with time limit via subprocess timeout.
Memory limiting uses RLIMIT_AS on Linux (inside Docker).
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

COMPILE_TIMEOUT = 30


def _preexec_memory(memory_mb: int):
    try:
        import resource
        limit = memory_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    except Exception:
        pass


def run_in_sandbox(
    source_code: str,
    language: str,
    stdin_data: str,
    time_limit_ms: int,
    memory_limit_mb: int,
) -> dict:
    """Run source_code and return {verdict, output?, time_ms, error?}."""
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            run_cmd, error = _prepare(source_code, language, memory_limit_mb, tmpdir)
        except Exception as e:
            return {"verdict": "CE", "error": str(e)}
        if error:
            return error

        time_limit_sec = time_limit_ms / 1000.0

        preexec = None
        if sys.platform != "win32":
            def _preexec():
                _preexec_memory(memory_limit_mb)
            preexec = _preexec

        start = time.monotonic()
        try:
            proc = subprocess.run(
                run_cmd,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=time_limit_sec + 2,
                preexec_fn=preexec,
                cwd=tmpdir,
            )
        except subprocess.TimeoutExpired:
            return {"verdict": "TL", "time_ms": time_limit_ms}
        except MemoryError:
            return {"verdict": "ML"}
        except Exception as exc:
            return {"verdict": "RE", "error": str(exc)}

        elapsed_ms = int((time.monotonic() - start) * 1000)

        if elapsed_ms > time_limit_ms:
            return {"verdict": "TL", "time_ms": elapsed_ms}

        if proc.returncode != 0:
            stderr = (proc.stderr or "")[:500]
            if any(k in stderr for k in ("MemoryError", "bad_alloc", "OutOfMemoryError")):
                return {"verdict": "ML", "time_ms": elapsed_ms}
            return {"verdict": "RE", "time_ms": elapsed_ms, "error": stderr}

        return {"verdict": "OK", "output": proc.stdout, "time_ms": elapsed_ms}


def _prepare(source_code: str, language: str, memory_limit_mb: int, tmpdir: str):
    """Write and optionally compile source; return (run_cmd, error_dict_or_None)."""
    if language == "python":
        path = os.path.join(tmpdir, "solution.py")
        _write(path, source_code)
        # sys.executable is the running interpreter — reliable on Windows & Linux
        # (on Windows "python3" launches the Microsoft Store stub).
        py = sys.executable or shutil.which("python3") or shutil.which("python") or "python3"
        return [py, path], None

    if language == "cpp":
        src = os.path.join(tmpdir, "solution.cpp")
        exe = os.path.join(tmpdir, "solution")
        _write(src, source_code)
        res = subprocess.run(
            ["g++", "-O2", "-std=c++17", src, "-o", exe],
            capture_output=True, text=True, timeout=COMPILE_TIMEOUT,
        )
        if res.returncode != 0:
            return None, {"verdict": "CE", "error": res.stderr[:1000]}
        return [exe], None

    if language == "java":
        m = re.search(r"public\s+class\s+(\w+)", source_code)
        cls = m.group(1) if m else "Solution"
        src = os.path.join(tmpdir, f"{cls}.java")
        _write(src, source_code)
        res = subprocess.run(
            ["javac", src],
            capture_output=True, text=True, timeout=COMPILE_TIMEOUT, cwd=tmpdir,
        )
        if res.returncode != 0:
            return None, {"verdict": "CE", "error": res.stderr[:1000]}
        return ["java", f"-Xmx{memory_limit_mb}m", "-cp", tmpdir, cls], None

    return None, {"verdict": "CE", "error": f"Unsupported language: {language}"}


def _write(path: str, content: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
