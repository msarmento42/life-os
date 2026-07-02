from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import datetime

from database import get_db
from services.vault_export import export_all

router = APIRouter(prefix="/api/export", tags=["export"])


@router.post("/vault")
def export_vault(as_of: str = None, db: Session = Depends(get_db)):
    """
    Write local Markdown summaries (weekly time/energy rollup, health trends,
    active goals snapshot) to exports/vault/ for later inclusion in the
    Marcus OS vault. Local file writes only -- no network calls, no
    vault-repo access.
    """
    parsed_as_of = datetime.date.fromisoformat(as_of) if as_of else None
    paths = export_all(as_of=parsed_as_of, db=db)
    return {"written": [str(p) for p in paths]}
