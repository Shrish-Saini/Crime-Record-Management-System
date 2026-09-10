import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from routes.cases import create_case, delete_case, get_case, get_cases, update_case
from schemas.case import CaseCreate, CaseUpdate


class CaseRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.session_factory = sessionmaker(bind=cls.engine, autocommit=False, autoflush=False)

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def test_case_crud_and_validation(self):
        db = self.session_factory()
        try:
            self.assertEqual(get_cases(skip=0, limit=100, status_filter=None, investigating_officer_id=None, db=db), [])

            created = create_case(
                CaseCreate(fir_id=1001, case_title="  Burglary at Market  ", status="Open"), db=db
            )
            self.assertEqual(created.case_title, "Burglary at Market")
            self.assertEqual(get_case(created.case_id, db=db).case_id, created.case_id)
            self.assertEqual(
                get_cases(skip=0, limit=100, status_filter="Open", investigating_officer_id=None, db=db)[0].case_id,
                created.case_id,
            )

            with self.assertRaises(HTTPException) as duplicate:
                create_case(CaseCreate(fir_id=1001, case_title="Duplicate"), db=db)
            self.assertEqual(duplicate.exception.status_code, 409)

            updated = update_case(
                created.case_id,
                CaseUpdate(start_date="2026-01-02", closing_date="2026-02-03", status="Closed"),
                db=db,
            )
            self.assertEqual(updated.status, "Closed")
            with self.assertRaises(HTTPException) as bad_dates:
                update_case(created.case_id, CaseUpdate(closing_date="2026-01-01"), db=db)
            self.assertEqual(bad_dates.exception.status_code, 422)

            self.assertEqual(delete_case(created.case_id, db=db).status_code, 204)
            with self.assertRaises(HTTPException) as missing:
                get_case(created.case_id, db=db)
            self.assertEqual(missing.exception.status_code, 404)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
