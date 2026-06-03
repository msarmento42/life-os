from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel
import os
import re
import json
from datetime import datetime
from pathlib import Path

router = APIRouter(prefix="/api/wiki", tags=["wiki"])

WIKI_PATH = Path("/Users/msarmento/Documents/Claude/wiki")
RECENT_FILE = Path("/tmp/life_os_wiki_recent.json")


def get_recent():
    if RECENT_FILE.exists():
        try:
            return json.loads(RECENT_FILE.read_text())
        except:
            return []
    return []


def add_to_recent(path: str):
    recent = get_recent()
    recent = [r for r in recent if r != path]
    recent.insert(0, path)
    recent = recent[:10]
    RECENT_FILE.write_text(json.dumps(recent))


def build_tree(base_path: Path, rel: str = "") -> list:
    """Recursively build a file tree for the wiki."""
    items = []
    try:
        entries = sorted(base_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        for entry in entries:
            if entry.name.startswith("."):
                continue
            rel_path = f"{rel}/{entry.name}" if rel else entry.name
            if entry.is_dir():
                children = build_tree(entry, rel_path)
                items.append({
                    "type": "folder",
                    "name": entry.name,
                    "path": rel_path,
                    "children": children,
                })
            elif entry.suffix in (".md", ".txt", ".markdown"):
                items.append({
                    "type": "file",
                    "name": entry.stem,
                    "path": rel_path,
                    "modified": datetime.fromtimestamp(entry.stat().st_mtime).isoformat(),
                })
    except PermissionError:
        pass
    return items


def find_backlinks(target_path: str, base_path: Path) -> list:
    """Find all articles that link to the given path."""
    target_stem = Path(target_path).stem
    backlinks = []
    for md_file in base_path.rglob("*.md"):
        content = md_file.read_text(errors="ignore")
        rel = str(md_file.relative_to(base_path))
        if rel == target_path:
            continue
        # Look for [[target]] or [text](target) links
        if f"[[{target_stem}]]" in content or f"({target_path})" in content or f"({target_stem})" in content:
            backlinks.append(str(md_file.relative_to(base_path)))
    return backlinks


def full_text_search(query: str, base_path: Path, limit: int = 20) -> list:
    """Search all markdown files for a query."""
    results = []
    query_lower = query.lower()
    for md_file in base_path.rglob("*.md"):
        try:
            content = md_file.read_text(errors="ignore")
            if query_lower in content.lower():
                rel_path = str(md_file.relative_to(base_path))
                # Find snippet
                idx = content.lower().find(query_lower)
                start = max(0, idx - 80)
                end = min(len(content), idx + 120)
                snippet = content[start:end].replace("\n", " ")
                results.append({
                    "path": rel_path,
                    "name": md_file.stem,
                    "snippet": snippet,
                })
                if len(results) >= limit:
                    break
        except Exception:
            pass
    return results


# --- Schemas ---
class ArticleWrite(BaseModel):
    path: str
    content: str

class ArticleCreate(BaseModel):
    path: str
    title: str
    folder: str = ""


# --- Endpoints ---
@router.get("/tree")
def get_wiki_tree():
    if not WIKI_PATH.exists():
        return []
    return build_tree(WIKI_PATH)


@router.get("/article")
def get_article(path: str):
    file_path = WIKI_PATH / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Article not found")
    content = file_path.read_text(errors="ignore")

    # Parse frontmatter if any
    title = file_path.stem.replace("-", " ").replace("_", " ").title()
    fm_match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if fm_match:
        fm = fm_match.group(1)
        title_match = re.search(r"^title:\s*(.+)$", fm, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()

    add_to_recent(path)
    backlinks = find_backlinks(path, WIKI_PATH)

    return {
        "path": path,
        "title": title,
        "content": content,
        "backlinks": backlinks,
        "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
    }


@router.put("/article")
def save_article(data: ArticleWrite):
    file_path = WIKI_PATH / data.path
    if not file_path.parent.exists():
        file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(data.content, encoding="utf-8")
    return {"ok": True, "path": data.path}


@router.post("/article")
def create_article(data: ArticleCreate):
    # Build path from folder + title
    safe_name = re.sub(r"[^\w\s-]", "", data.title).strip().replace(" ", "-")
    if data.folder:
        path = f"{data.folder}/{safe_name}.md"
    else:
        path = f"{safe_name}.md"
    file_path = WIKI_PATH / path
    if file_path.exists():
        raise HTTPException(status_code=409, detail="Article already exists")
    if not file_path.parent.exists():
        file_path.parent.mkdir(parents=True, exist_ok=True)
    initial_content = f"# {data.title}\n\n"
    file_path.write_text(initial_content, encoding="utf-8")
    return {"ok": True, "path": path}


@router.delete("/article")
def delete_article(path: str):
    file_path = WIKI_PATH / path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    file_path.unlink()
    return {"ok": True}


@router.get("/search")
def search_wiki(q: str, limit: int = 20):
    if not WIKI_PATH.exists():
        return []
    return full_text_search(q, WIKI_PATH, limit)


# ─────────────────────────────────────────────
# W1.01 — Backlink endpoints
# ─────────────────────────────────────────────

@router.get("/backlinks")
def get_backlinks_for_path(path: str):
    """
    Return all articles that link to the article at `path`.
    Also returns the target article's title.
    """
    if not WIKI_PATH.exists():
        return {"path": path, "title": "", "backlinks": []}

    file_path = WIKI_PATH / path
    title = Path(path).stem.replace("-", " ").replace("_", " ").title()
    if file_path.exists():
        content = file_path.read_text(errors="ignore")
        fm_match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
        if fm_match:
            t = re.search(r"^title:\s*(.+)$", fm_match.group(1), re.MULTILINE)
            if t:
                title = t.group(1).strip()

    raw_backlinks = find_backlinks(path, WIKI_PATH)
    result = []
    for bp in raw_backlinks:
        bp_file = WIKI_PATH / bp
        bl_title = Path(bp).stem.replace("-", " ").replace("_", " ").title()
        try:
            bc = bp_file.read_text(errors="ignore")
            m = re.match(r"^---\n(.*?)\n---\n", bc, re.DOTALL)
            if m:
                t2 = re.search(r"^title:\s*(.+)$", m.group(1), re.MULTILINE)
                if t2:
                    bl_title = t2.group(1).strip()
        except Exception:
            pass
        result.append({"path": bp, "title": bl_title, "slug": Path(bp).stem})

    return {"path": path, "title": title, "backlinks": result, "count": len(result)}


@router.get("/backlink-counts")
def get_backlink_counts():
    """
    Return a dict of {path: backlink_count} for all markdown files.
    Used by the frontend to show link-count badges in the file tree.
    """
    if not WIKI_PATH.exists():
        return {}
    all_files = list(WIKI_PATH.rglob("*.md"))
    counts = {}
    for f in all_files:
        rel = str(f.relative_to(WIKI_PATH))
        bls = find_backlinks(rel, WIKI_PATH)
        if bls:
            counts[rel] = len(bls)
    return counts


@router.get("/recent")
def get_recent_articles():
    recent_paths = get_recent()
    result = []
    for path in recent_paths:
        file_path = WIKI_PATH / path
        if file_path.exists():
            result.append({
                "path": path,
                "name": file_path.stem,
                "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
            })
    return result


@router.get("/index")
def get_wiki_index():
    index_path = WIKI_PATH / "_INDEX.md"
    if index_path.exists():
        content = index_path.read_text(errors="ignore")
    else:
        # Auto-generate a basic index
        tree = build_tree(WIKI_PATH)
        lines = ["# Wiki Index\n"]
        def flatten(items, depth=0):
            for item in items:
                if item["type"] == "folder":
                    lines.append(f"{'  ' * depth}**{item['name']}**\n")
                    flatten(item["children"], depth + 1)
                else:
                    lines.append(f"{'  ' * depth}- [{item['name']}]({item['path']})\n")
        flatten(tree)
        content = "\n".join(lines)
    return {"content": content}
