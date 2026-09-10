"""Schema-reflected CRUD routes for the existing CRMS tables.

The database is reflected for reads only.  This keeps the API aligned with the
live 24-table MySQL schema without creating, migrating, or altering any table.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Type

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, create_model
from sqlalchemy import Boolean, Date, DateTime, MetaData, Numeric, Table, Time, delete, insert, select, text, update
from sqlalchemy.exc import DataError, IntegrityError, StatementError
from sqlalchemy.orm import Session
from sqlalchemy.sql.sqltypes import BigInteger, Integer, SmallInteger

from database import engine, get_db


RESOURCE_TABLES = {
    "users": "Users",
    "police_stations": "Police Stations",
    "police_officers": "Police Officers",
    "persons": "Persons",
    "criminals": "Criminals",
    "crimes": "Crimes",
    "fir": "FIR",
    "case_charges": "Case Charges",
    "victims": "Victims",
    "bns_sections": "BNS Sections",
    "evidence": "Evidence",
    "investigations": "Investigations",
    "arrests": "Arrests",
    "bail_applications": "Bail Applications",
    "chargesheets": "Chargesheets",
    "courts": "Courts",
    "court_proceedings": "Court Proceedings",
    "judgments": "Judgments",
    "sentences": "Sentences",
    "prisons": "Prisons",
    "imprisonments": "Imprisonments",
    "case_timeline": "Case Timeline",
}

READ_ONLY_TABLES = {"bns_sections"}
SENSITIVE_COLUMNS = {"password"}

metadata = MetaData()
metadata.reflect(bind=engine, only=list(RESOURCE_TABLES) + ["case_criminals"])

router = APIRouter(tags=["Resources"])
case_criminals_router = APIRouter(prefix="/case-criminals", tags=["Case Criminals"])


def _python_type(column: Any) -> Type[Any]:
    column_type = column.type
    if isinstance(column_type, Boolean):
        return bool
    if isinstance(column_type, (SmallInteger, Integer, BigInteger)):
        return int
    if isinstance(column_type, Numeric):
        return Decimal
    if isinstance(column_type, DateTime):
        return datetime
    if isinstance(column_type, Date):
        return date
    if isinstance(column_type, Time):
        return time
    return str


def _field_definition(column: Any, *, write: bool, partial: bool = False):
    python_type = _python_type(column)
    field_options: Dict[str, Any] = {}
    if write and getattr(column.type, "length", None):
        field_options["max_length"] = column.type.length

    required = not partial and not column.nullable and column.default is None and column.server_default is None
    if partial or column.nullable or not required:
        return Optional[python_type], Field(default=None, **field_options)
    return python_type, Field(..., **field_options)


def _schema_for(table: Table, name: str, *, mode: str) -> Type[BaseModel]:
    fields = {}
    for column in table.columns:
        if column.name in SENSITIVE_COLUMNS and mode == "response":
            continue
        if mode == "create" and column.primary_key and column.autoincrement:
            continue
        fields[column.name] = _field_definition(column, write=mode != "response", partial=mode == "update")
    return create_model(name, __config__=ConfigDict(extra="forbid"), **fields)


def _serialize(record: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if record is None:
        return None
    return {key: value for key, value in record.items() if key not in SENSITIVE_COLUMNS}


def _get_record_or_404(db: Session, table: Table, primary_key: Any, record_id: int) -> Dict[str, Any]:
    record = db.execute(select(table).where(primary_key == record_id)).mappings().one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{table.name} record not found")
    return dict(record)


def _execute_write(db: Session, statement: Any, action: str, table_name: str):
    try:
        result = db.execute(statement)
        db.commit()
        return result
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unable to {action} {table_name}: duplicate, related, or dependent record conflict",
        ) from exc
    except (DataError, StatementError, ValueError) as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {table_name} data") from exc


def _register_single_key_resource(table_name: str, label: str) -> None:
    table = metadata.tables[table_name]
    primary_keys = list(table.primary_key.columns)
    if len(primary_keys) != 1:
        raise RuntimeError(f"{table_name} requires a dedicated composite-key router")

    primary_key = primary_keys[0]
    route_prefix = "/" + table_name.replace("_", "-")
    response_schema = _schema_for(table, f"{table_name.title().replace('_', '')}Response", mode="response")
    create_schema = _schema_for(table, f"{table_name.title().replace('_', '')}Create", mode="create")
    update_schema = _schema_for(table, f"{table_name.title().replace('_', '')}Update", mode="update")

    def list_records(
        skip: int = Query(default=0, ge=0),
        limit: int = Query(default=100, ge=1, le=500),
        db: Session = Depends(get_db),
    ):
        records = db.execute(select(table).offset(skip).limit(limit)).mappings().all()
        return [_serialize(dict(record)) for record in records]

    def get_record(record_id: int, db: Session = Depends(get_db)):
        return _serialize(_get_record_or_404(db, table, primary_key, record_id))

    router.add_api_route(
        route_prefix + "/",
        list_records,
        methods=["GET"],
        response_model=List[response_schema],
        name=f"list_{table_name}",
        summary=f"List {label}",
    )
    router.add_api_route(
        route_prefix + "/{record_id}",
        get_record,
        methods=["GET"],
        response_model=response_schema,
        name=f"get_{table_name}",
        summary=f"Get {label} by ID",
    )

    if table_name in READ_ONLY_TABLES:
        return

    def create_record(payload: create_schema, db: Session = Depends(get_db)):
        values = payload.model_dump(exclude_unset=True)
        result = _execute_write(db, insert(table).values(**values), "create", table_name)
        inserted_id = result.inserted_primary_key[0]
        return _serialize(_get_record_or_404(db, table, primary_key, inserted_id))

    def update_record(record_id: int, payload: update_schema, db: Session = Depends(get_db)):
        _get_record_or_404(db, table, primary_key, record_id)
        values = payload.model_dump(exclude_unset=True)
        if not values:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one field to update")
        if any(value is None and not table.c[key].nullable for key, value in values.items()):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Required fields cannot be null")
        _execute_write(db, update(table).where(primary_key == record_id).values(**values), "update", table_name)
        return _serialize(_get_record_or_404(db, table, primary_key, record_id))

    def delete_record(record_id: int, db: Session = Depends(get_db)):
        _get_record_or_404(db, table, primary_key, record_id)
        _execute_write(db, delete(table).where(primary_key == record_id), "delete", table_name)
        return {"detail": f"{label} deleted"}

    router.add_api_route(
        route_prefix + "/",
        create_record,
        methods=["POST"],
        response_model=response_schema,
        status_code=status.HTTP_201_CREATED,
        name=f"create_{table_name}",
        summary=f"Create {label}",
    )
    for method in ("PUT", "PATCH"):
        router.add_api_route(
            route_prefix + "/{record_id}",
            update_record,
            methods=[method],
            response_model=response_schema,
            name=f"{method.lower()}_{table_name}",
            summary=f"Update {label}",
        )
    router.add_api_route(
        route_prefix + "/{record_id}",
        delete_record,
        methods=["DELETE"],
        status_code=status.HTTP_200_OK,
        name=f"delete_{table_name}",
        summary=f"Delete {label}",
    )


for _table_name, _label in RESOURCE_TABLES.items():
    _register_single_key_resource(_table_name, _label)


class CaseCriminalCreate(BaseModel):
    case_id: int = Field(gt=0)
    criminal_id: int = Field(gt=0)
    involvement: Optional[str] = Field(default=None, max_length=50)
    remarks: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class CaseCriminalUpdate(BaseModel):
    involvement: Optional[str] = Field(default=None, max_length=50)
    remarks: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


def _case_criminal_or_404(db: Session, case_id: int, criminal_id: int) -> Dict[str, Any]:
    table = metadata.tables["case_criminals"]
    record = db.execute(
        select(table).where(table.c.case_id == case_id, table.c.criminal_id == criminal_id)
    ).mappings().one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case-criminal relationship not found")
    return dict(record)


def _case_criminal_rows(db: Session, case_id: Optional[int] = None) -> List[Dict[str, Any]]:
    where_clause = "WHERE cc.case_id = :case_id" if case_id is not None else ""
    result = db.execute(
        text(
            f"""
            SELECT cc.case_id, cc.criminal_id, cc.involvement, cc.remarks,
                   p.full_name AS criminal_name, cr.criminal_status, cr.identification_details
            FROM case_criminals AS cc
            JOIN criminals AS cr ON cr.criminal_id = cc.criminal_id
            JOIN persons AS p ON p.person_id = cr.person_id
            {where_clause}
            ORDER BY cc.case_id ASC, p.full_name ASC
            """
        ),
        {"case_id": case_id} if case_id is not None else {},
    ).mappings().all()
    return [dict(row) for row in result]


def _case_criminal_detail(db: Session, case_id: int, criminal_id: int) -> Dict[str, Any]:
    _case_criminal_or_404(db, case_id, criminal_id)
    return next(item for item in _case_criminal_rows(db, case_id) if item["criminal_id"] == criminal_id)


@case_criminals_router.get("/")
def list_case_criminals(db: Session = Depends(get_db)):
    return _case_criminal_rows(db)


@case_criminals_router.get("/{case_id}/{criminal_id}")
def get_case_criminal(case_id: int, criminal_id: int, db: Session = Depends(get_db)):
    return _case_criminal_detail(db, case_id, criminal_id)


@case_criminals_router.post("/", status_code=status.HTTP_201_CREATED)
def create_case_criminal(payload: CaseCriminalCreate, db: Session = Depends(get_db)):
    table = metadata.tables["case_criminals"]
    values = payload.model_dump()
    _execute_write(db, insert(table).values(**values), "create", "case-criminal relationship")
    return _case_criminal_detail(db, payload.case_id, payload.criminal_id)


@case_criminals_router.put("/{case_id}/{criminal_id}")
@case_criminals_router.patch("/{case_id}/{criminal_id}")
def update_case_criminal(case_id: int, criminal_id: int, payload: CaseCriminalUpdate, db: Session = Depends(get_db)):
    table = metadata.tables["case_criminals"]
    _case_criminal_or_404(db, case_id, criminal_id)
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one field to update")
    _execute_write(
        db,
        update(table).where(table.c.case_id == case_id, table.c.criminal_id == criminal_id).values(**values),
        "update",
        "case-criminal relationship",
    )
    return _case_criminal_detail(db, case_id, criminal_id)


@case_criminals_router.delete("/{case_id}/{criminal_id}")
def delete_case_criminal(case_id: int, criminal_id: int, db: Session = Depends(get_db)):
    table = metadata.tables["case_criminals"]
    _case_criminal_or_404(db, case_id, criminal_id)
    _execute_write(
        db,
        delete(table).where(table.c.case_id == case_id, table.c.criminal_id == criminal_id),
        "delete",
        "case-criminal relationship",
    )
    return {"detail": "Case-criminal relationship deleted"}
