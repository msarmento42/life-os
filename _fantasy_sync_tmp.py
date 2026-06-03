import sys
from datetime import datetime

try:
    from database import init_db, SessionLocal
    init_db()
    from services.sleeper_sync import full_sync
    from services.fantasy_engine import sync_fc_values

    db = SessionLocal()
    ts = datetime.now().strftime('%H:%M')
    print(f'[{ts}] Starting daily fantasy sync...')

    r = full_sync(db)
    print(f"  Sleeper: leagues={r['leagues']} rosters={r['rosters']} players={r['players']} picks={r['picks']}")

    fc = sync_fc_values(db)
    print(f'  FantasyCalc: {fc} players updated')

    db.close()
    print('Done.')
    print(f"RESULT|OK|leagues={r['leagues']}|rosters={r['rosters']}|players={r['players']}|picks={r['picks']}|fc={fc}")
except Exception as e:
    import traceback
    print('RESULT|FAIL|' + repr(e))
    traceback.print_exc()
    sys.exit(1)
