from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from routes.auth import get_current_user

router = APIRouter(
    prefix="/person-search",
    tags=["Person Search"]
)


@router.get("/aadhaar/{aadhaar_number}")
def search_by_aadhaar(
    aadhaar_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    aadhaar_number = aadhaar_number.strip()

    if not aadhaar_number.isdigit() or len(aadhaar_number) != 12:
        raise HTTPException(
            status_code=400,
            detail="Aadhaar number must contain exactly 12 digits"
        )

    person = db.execute(
        text("""
            SELECT
                person_id,
                full_name,
                date_of_birth,
                gender,
                phone,
                email,
                address,
                city,
                state,
                pincode
            FROM persons
            WHERE aadhaar_number = :aadhaar
        """),
        {"aadhaar": aadhaar_number}
    ).mappings().one_or_none()

    if person is None:
        raise HTTPException(
            status_code=404,
            detail="No person found with this Aadhaar number"
        )

    person = dict(person)

    cases = db.execute(
    text("""
        SELECT DISTINCT
            c.case_id,
            c.case_title,
            c.start_date,
            c.status,
            c.outcome,

            CASE
                WHEN v.person_id IS NOT NULL THEN 'Victim'
                WHEN cr.person_id IS NOT NULL THEN 'Accused'
            END AS involvement

        FROM cases c

        LEFT JOIN victims v
            ON v.case_id = c.case_id
           AND v.person_id = :person_id

        LEFT JOIN case_criminals cc
            ON cc.case_id = c.case_id

        LEFT JOIN criminals cr
            ON cr.criminal_id = cc.criminal_id
           AND cr.person_id = :person_id

        WHERE v.person_id IS NOT NULL
           OR cr.person_id IS NOT NULL

        ORDER BY c.case_id
    """),
    {"person_id": person["person_id"]}
).mappings().all()
    case_results = []

    for case in cases:

        case = dict(case)

        charges = db.execute(
    text("""
        SELECT
            b.section_number,
            b.section_title,
            b.description,
            cc.charge_status,
            cc.charge_date,
            cc.remarks
        FROM case_charges cc
        INNER JOIN bns_sections b
            ON b.bns_section_id = cc.bns_section_id
        WHERE cc.case_id = :case_id
          AND cc.criminal_id = (
              SELECT cr.criminal_id
              FROM criminals cr
              WHERE cr.person_id = :person_id
              LIMIT 1
          )
    """),
    {
        "case_id": case["case_id"],
        "person_id": person["person_id"]
    }
).mappings().all()

    case["charges"] = [dict(charge) for charge in charges]

    case_results.append(case)
    return {
    "person": person,
    "cases": case_results
}