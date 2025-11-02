from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import State

STATE_DATA = [
    ("AL", "Alabama"),
    ("AK", "Alaska"),
    ("AZ", "Arizona"),
    ("AR", "Arkansas"),
    ("CA", "California"),
    ("CO", "Colorado"),
    ("CT", "Connecticut"),
    ("DE", "Delaware"),
    ("FL", "Florida"),
    ("GA", "Georgia"),
    ("HI", "Hawaii"),
    ("ID", "Idaho"),
    ("IL", "Illinois"),
    ("IN", "Indiana"),
    ("IA", "Iowa"),
    ("KS", "Kansas"),
    ("KY", "Kentucky"),
    ("LA", "Louisiana"),
    ("ME", "Maine"),
    ("MD", "Maryland"),
    ("MA", "Massachusetts"),
    ("MI", "Michigan"),
    ("MN", "Minnesota"),
    ("MS", "Mississippi"),
    ("MO", "Missouri"),
    ("MT", "Montana"),
    ("NE", "Nebraska"),
    ("NV", "Nevada"),
    ("NH", "New Hampshire"),
    ("NJ", "New Jersey"),
    ("NM", "New Mexico"),
    ("NY", "New York"),
    ("NC", "North Carolina"),
    ("ND", "North Dakota"),
    ("OH", "Ohio"),
    ("OK", "Oklahoma"),
    ("OR", "Oregon"),
    ("PA", "Pennsylvania"),
    ("RI", "Rhode Island"),
    ("SC", "South Carolina"),
    ("SD", "South Dakota"),
    ("TN", "Tennessee"),
    ("TX", "Texas"),
    ("UT", "Utah"),
    ("VT", "Vermont"),
    ("VA", "Virginia"),
    ("WA", "Washington"),
    ("WV", "West Virginia"),
    ("WI", "Wisconsin"),
    ("WY", "Wyoming"),
]


def seed_states(session: Session | None = None) -> tuple[int, int]:
    """
    Ensure the reference state table contains the full abbreviation list.
    Returns a tuple of (inserted_count, updated_count).
    """
    external_session = session is not None
    db = session or SessionLocal()
    inserted = 0
    updated = 0

    try:
        existing_states = {
            state.state_abbr.upper(): state
            for state in db.scalars(select(State))
        }

        for abbr, name in STATE_DATA:
            abbr_upper = abbr.upper()
            record = existing_states.get(abbr_upper)
            if record:
                if record.state != name:
                    record.state = name
                    updated += 1
            else:
                db.add(State(state_abbr=abbr_upper, state=name))
                inserted += 1

        if inserted or updated:
            db.commit()

        return inserted, updated
    finally:
        if not external_session:
            db.close()


if __name__ == "__main__":
    inserted, updated = seed_states()
    if inserted or updated:
        print(f"Seeded states: {inserted} inserted, {updated} updated.")
    else:
        print("State table already populated with current data.")
