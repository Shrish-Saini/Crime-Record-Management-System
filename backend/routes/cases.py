from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.case import Case
from schemas.case import CaseCreate, CaseResponse, CaseUpdate


router = APIRouter(
    prefix="/cases",
    tags=["Cases"]
)


def _get_case_or_404(case_id: int, db: Session) -> Case:
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


def _commit_or_conflict(db: Session, message: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc


def _query_rows(db: Session, sql: str, case_id: int) -> List[Dict[str, Any]]:
    """Execute a read-only dashboard query and return JSON-ready mappings."""
    return [dict(row) for row in db.execute(text(sql), {"case_id": case_id}).mappings().all()]


def _query_row(db: Session, sql: str, case_id: int) -> Optional[Dict[str, Any]]:
    rows = _query_rows(db, sql, case_id)
    return rows[0] if rows else None


@router.get("/", response_model=List[CaseResponse])
def get_cases(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    investigating_officer_id: Optional[int] = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = db.query(Case)
    if status_filter:
        query = query.filter(Case.status == status_filter)
    if investigating_officer_id:
        query = query.filter(Case.investigating_officer_id == investigating_officer_id)
    cases = query.order_by(Case.case_id).offset(skip).limit(limit).all()
    return cases

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    return _get_case_or_404(case_id, db)


@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    if db.query(Case.case_id).filter(Case.fir_id == payload.fir_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A case already exists for this FIR")

    case = Case(**payload.model_dump())
    db.add(case)
    _commit_or_conflict(db, "Unable to create case: FIR or related record is invalid")
    db.refresh(case)
    return case



@router.put("/{case_id}", response_model=CaseResponse)
@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, payload: CaseUpdate, db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)
    changes = payload.model_dump(exclude_unset=True)

    if "fir_id" in changes and changes["fir_id"] != case.fir_id:
        duplicate = db.query(Case.case_id).filter(Case.fir_id == changes["fir_id"], Case.case_id != case_id).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A case already exists for this FIR")

    proposed_start = changes.get("start_date", case.start_date)
    proposed_closing = changes.get("closing_date", case.closing_date)
    if proposed_start and proposed_closing and proposed_closing < proposed_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="closing_date cannot be earlier than start_date")

    for field, value in changes.items():
        setattr(case, field, value)

    _commit_or_conflict(db, "Unable to update case: FIR or related record is invalid")
    db.refresh(case)
    return case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)
    db.delete(case)
    _commit_or_conflict(db, "Unable to delete case because it is referenced by another record")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT ct.timeline_id, ct.event_type, ct.event_title, ct.event_description,
               ct.event_datetime, ct.remarks, ct.performed_by AS performed_by_user_id,
               u.username AS performed_by_username, po.officer_id AS performed_by_officer_id,
               po.name AS performed_by_officer_name, po.rank AS performed_by_officer_rank
        FROM case_timeline AS ct
        LEFT JOIN users AS u ON u.user_id = ct.performed_by
        LEFT JOIN police_officers AS po ON po.officer_id = u.officer_id
        WHERE ct.case_id = :case_id
        ORDER BY ct.event_datetime ASC, ct.timeline_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/fir")
def get_case_fir(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_row(
        db,
        """
        SELECT f.fir_id, f.fir_number, f.incident_date, f.incident_time, f.incident_location,
               f.description, f.registration_date, f.status,
               ps.station_id, ps.station_name, ps.address AS station_address,
               ps.city AS station_city, ps.state AS station_state, ps.phone AS station_phone,
               p.person_id AS complainant_id, p.full_name AS complainant_name,
               p.phone AS complainant_phone, p.email AS complainant_email,
               cr.crime_id, cr.crime_name, cr.description AS crime_description, cr.severity AS crime_severity
        FROM cases AS c
        JOIN fir AS f ON f.fir_id = c.fir_id
        JOIN police_stations AS ps ON ps.station_id = f.station_id
        JOIN persons AS p ON p.person_id = f.complainant_id
        JOIN crimes AS cr ON cr.crime_id = f.crime_id
        WHERE c.case_id = :case_id
        """,
        case_id,
    )


@router.get("/{case_id}/criminals")
def get_case_criminals(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT cc.criminal_id, cc.involvement, cc.remarks AS case_remarks,
               cr.criminal_status, cr.identification_details, cr.remarks AS criminal_remarks,
               p.person_id, p.full_name, p.date_of_birth, p.gender, p.phone, p.email,
               p.address, p.city, p.state, p.pincode
        FROM case_criminals AS cc
        JOIN criminals AS cr ON cr.criminal_id = cc.criminal_id
        JOIN persons AS p ON p.person_id = cr.person_id
        WHERE cc.case_id = :case_id
        ORDER BY p.full_name ASC
        """,
        case_id,
    )


@router.get("/{case_id}/victims")
def get_case_victims(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT v.victim_id, v.injury_details, v.statement, v.status,
               p.person_id, p.full_name, p.date_of_birth, p.gender, p.phone, p.email,
               p.address, p.city, p.state, p.pincode
        FROM victims AS v
        JOIN persons AS p ON p.person_id = v.person_id
        WHERE v.case_id = :case_id
        ORDER BY p.full_name ASC
        """,
        case_id,
    )


@router.get("/{case_id}/evidence")
def get_case_evidence(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT e.evidence_id, e.evidence_type, e.description, e.collection_date,
               e.location_found, e.file_path, e.status,
               po.officer_id AS collected_by_officer_id, po.name AS collected_by_name,
               po.rank AS collected_by_rank, po.badge_number AS collected_by_badge_number
        FROM evidence AS e
        JOIN police_officers AS po ON po.officer_id = e.collected_by
        WHERE e.case_id = :case_id
        ORDER BY e.collection_date ASC, e.evidence_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/investigations")
def get_case_investigations(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT i.investigation_id, i.start_date, i.end_date, i.findings, i.status, i.remarks,
               po.officer_id, po.name AS officer_name, po.rank AS officer_rank,
               po.badge_number AS officer_badge_number, po.phone AS officer_phone
        FROM investigations AS i
        JOIN police_officers AS po ON po.officer_id = i.officer_id
        WHERE i.case_id = :case_id
        ORDER BY i.start_date ASC, i.investigation_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/arrests")
def get_case_arrests(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT a.arrest_id, a.arrest_date, a.arrest_location, a.reason,
               a.court_production_date, a.custody_status,
               cr.criminal_id, p.full_name AS criminal_name,
               po.officer_id, po.name AS arresting_officer_name, po.rank AS arresting_officer_rank
        FROM arrests AS a
        JOIN criminals AS cr ON cr.criminal_id = a.criminal_id
        JOIN persons AS p ON p.person_id = cr.person_id
        JOIN police_officers AS po ON po.officer_id = a.officer_id
        WHERE a.case_id = :case_id
        ORDER BY a.arrest_date ASC, a.arrest_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/bail")
def get_case_bail(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT b.bail_id, b.application_date, b.bail_type, b.decision_date, b.decision, b.conditions,
               cr.criminal_id, p.full_name AS criminal_name,
               co.court_id, co.court_name, co.court_type, co.city AS court_city, co.state AS court_state
        FROM bail_applications AS b
        JOIN criminals AS cr ON cr.criminal_id = b.criminal_id
        JOIN persons AS p ON p.person_id = cr.person_id
        JOIN courts AS co ON co.court_id = b.court_id
        WHERE b.case_id = :case_id
        ORDER BY b.application_date ASC, b.bail_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/charges")
def get_case_charges(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT cc.charge_id, cc.charge_date, cc.charge_status, cc.remarks,
               cr.criminal_id, p.full_name AS criminal_name,
               bs.bns_section_id, bs.chapter, bs.chapter_name, bs.chapter_subtype,
               bs.section_number, bs.section_title, bs.description AS section_description
        FROM case_charges AS cc
        JOIN criminals AS cr ON cr.criminal_id = cc.criminal_id
        JOIN persons AS p ON p.person_id = cr.person_id
        JOIN bns_sections AS bs ON bs.bns_section_id = cc.bns_section_id
        WHERE cc.case_id = :case_id
        ORDER BY cc.charge_date ASC, cc.charge_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/chargesheet")
def get_case_chargesheet(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_row(
        db,
        """
        SELECT cs.chargesheet_id, cs.submission_date, cs.report_type, cs.summary,
               cs.status, cs.document_path,
               po.officer_id AS submitted_by_officer_id, po.name AS submitted_by_name,
               po.rank AS submitted_by_rank, po.badge_number AS submitted_by_badge_number
        FROM chargesheets AS cs
        JOIN police_officers AS po ON po.officer_id = cs.submitted_by
        WHERE cs.case_id = :case_id
        ORDER BY cs.submission_date DESC, cs.chargesheet_id DESC
        LIMIT 1
        """,
        case_id,
    )


@router.get("/{case_id}/proceedings")
def get_case_proceedings(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT cp.proceeding_id, cp.proceeding_date, cp.judge_name, cp.proceeding_type,
               cp.proceedings, cp.next_hearing_date, cp.status,
               co.court_id, co.court_name, co.court_type, co.address AS court_address,
               co.city AS court_city, co.state AS court_state
        FROM court_proceedings AS cp
        JOIN courts AS co ON co.court_id = cp.court_id
        WHERE cp.case_id = :case_id
        ORDER BY cp.proceeding_date ASC, cp.proceeding_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/judgment")
def get_case_judgment(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_row(
        db,
        """
        SELECT j.judgment_id, j.judgment_date, j.result, j.summary, j.document_path,
               co.court_id, co.court_name, co.court_type, co.city AS court_city, co.state AS court_state
        FROM judgments AS j
        JOIN courts AS co ON co.court_id = j.court_id
        WHERE j.case_id = :case_id
        ORDER BY j.judgment_date DESC, j.judgment_id DESC
        LIMIT 1
        """,
        case_id,
    )


@router.get("/{case_id}/sentences")
def get_case_sentences(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT s.sentence_id, s.judgment_id, s.sentence_type, s.duration_months,
               s.fine_amount, s.start_date, s.end_date, s.details,
               cr.criminal_id, p.full_name AS criminal_name,
               j.judgment_date, j.result AS judgment_result
        FROM sentences AS s
        JOIN criminals AS cr ON cr.criminal_id = s.criminal_id
        JOIN persons AS p ON p.person_id = cr.person_id
        JOIN judgments AS j ON j.judgment_id = s.judgment_id
        WHERE s.case_id = :case_id
        ORDER BY s.sentence_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/imprisonment")
def get_case_imprisonment(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return _query_rows(
        db,
        """
        SELECT i.imprisonment_id, i.sentence_id, i.admission_date, i.expected_release_date,
               i.actual_release_date, i.status, i.remarks,
               cr.criminal_id, p.full_name AS criminal_name,
               pr.prison_id, pr.prison_name, pr.address AS prison_address,
               pr.city AS prison_city, pr.state AS prison_state, pr.contact_number AS prison_contact_number,
               s.sentence_type, s.duration_months, s.fine_amount
        FROM imprisonments AS i
        JOIN sentences AS s ON s.sentence_id = i.sentence_id
        JOIN criminals AS cr ON cr.criminal_id = i.criminal_id
        JOIN persons AS p ON p.person_id = cr.person_id
        JOIN prisons AS pr ON pr.prison_id = i.prison_id
        WHERE s.case_id = :case_id
        ORDER BY i.admission_date ASC, i.imprisonment_id ASC
        """,
        case_id,
    )


@router.get("/{case_id}/details")
def get_case_details(case_id: int, db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)
    fir = get_case_fir(case_id, db)
    officer = _query_row(
        db,
        """
        SELECT po.officer_id, po.name, po.rank, po.badge_number, po.phone, po.email,
               ps.station_id, ps.station_name
        FROM cases AS c
        LEFT JOIN police_officers AS po ON po.officer_id = c.investigating_officer_id
        LEFT JOIN police_stations AS ps ON ps.station_id = po.station_id
        WHERE c.case_id = :case_id
        """,
        case_id,
    )
    summary = _query_row(
        db,
        """
        SELECT
          (SELECT COUNT(*) FROM case_timeline WHERE case_id = :case_id) AS timeline_events,
          (SELECT COUNT(*) FROM case_criminals WHERE case_id = :case_id) AS criminals,
          (SELECT COUNT(*) FROM victims WHERE case_id = :case_id) AS victims,
          (SELECT COUNT(*) FROM evidence WHERE case_id = :case_id) AS evidence_items,
          (SELECT COUNT(*) FROM investigations WHERE case_id = :case_id) AS investigations,
          (SELECT COUNT(*) FROM arrests WHERE case_id = :case_id) AS arrests,
          (SELECT COUNT(*) FROM bail_applications WHERE case_id = :case_id) AS bail_applications,
          (SELECT COUNT(*) FROM case_charges WHERE case_id = :case_id) AS charges,
          (SELECT COUNT(*) FROM court_proceedings WHERE case_id = :case_id) AS proceedings,
          (SELECT COUNT(*) FROM sentences WHERE case_id = :case_id) AS sentences,
          (SELECT COUNT(*) FROM imprisonments AS i JOIN sentences AS s ON s.sentence_id = i.sentence_id
             WHERE s.case_id = :case_id) AS imprisonments
        """,
        case_id,
    )
    return {
        "case": {
            "case_id": case.case_id,
            "fir_id": case.fir_id,
            "case_title": case.case_title,
            "start_date": case.start_date,
            "status": case.status,
            "outcome": case.outcome,
            "closing_date": case.closing_date,
            "remarks": case.remarks,
        },
        "fir": fir,
        "investigating_officer": officer,
        "summary": summary,
    }
