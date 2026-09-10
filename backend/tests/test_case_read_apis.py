import unittest

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder

from database import SessionLocal
from routes.cases import (
    get_case_arrests,
    get_case_bail,
    get_case_charges,
    get_case_chargesheet,
    get_case_criminals,
    get_case_details,
    get_case_evidence,
    get_case_fir,
    get_case_imprisonment,
    get_case_investigations,
    get_case_judgment,
    get_case_proceedings,
    get_case_sentences,
    get_case_timeline,
    get_case_victims,
)


class CaseReadApiTests(unittest.TestCase):
    """Read-only integration tests against the existing CRMS demo records."""

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_every_read_endpoint_for_demo_cases(self):
        collection_endpoints = {
            "criminals": get_case_criminals,
            "victims": get_case_victims,
            "evidence": get_case_evidence,
            "investigations": get_case_investigations,
            "arrests": get_case_arrests,
            "bail": get_case_bail,
            "charges": get_case_charges,
            "proceedings": get_case_proceedings,
            "sentences": get_case_sentences,
            "imprisonment": get_case_imprisonment,
        }

        for case_id in (1, 2, 3):
            with self.subTest(case_id=case_id, endpoint="timeline"):
                timeline = get_case_timeline(case_id, db=self.db)
                self.assertIsInstance(timeline, list)
                self.assertEqual(
                    [event["event_datetime"] for event in timeline],
                    sorted(event["event_datetime"] for event in timeline),
                )
                self.assertIsInstance(jsonable_encoder(timeline), list)

            with self.subTest(case_id=case_id, endpoint="fir"):
                fir = get_case_fir(case_id, db=self.db)
                self.assertIsInstance(fir, dict)
                self.assertIn("fir_number", fir)
                self.assertIn("complainant_name", fir)
                self.assertIsInstance(jsonable_encoder(fir), dict)

            for endpoint_name, endpoint in collection_endpoints.items():
                with self.subTest(case_id=case_id, endpoint=endpoint_name):
                    result = endpoint(case_id, db=self.db)
                    self.assertIsInstance(result, list)
                    self.assertIsInstance(jsonable_encoder(result), list)

            with self.subTest(case_id=case_id, endpoint="chargesheet"):
                chargesheet = get_case_chargesheet(case_id, db=self.db)
                self.assertIsInstance(chargesheet, dict)
                self.assertIsInstance(jsonable_encoder(chargesheet), dict)

            with self.subTest(case_id=case_id, endpoint="judgment"):
                judgment = get_case_judgment(case_id, db=self.db)
                self.assertTrue(judgment is None or isinstance(judgment, dict))
                self.assertTrue(judgment is None or isinstance(jsonable_encoder(judgment), dict))

            with self.subTest(case_id=case_id, endpoint="details"):
                details = get_case_details(case_id, db=self.db)
                self.assertEqual(details["case"]["case_id"], case_id)
                self.assertIn("summary", details)
                self.assertIn("investigating_officer", details)
                self.assertIsInstance(jsonable_encoder(details), dict)

    def test_missing_case_returns_404(self):
        with self.assertRaises(HTTPException) as error:
            get_case_details(999999, db=self.db)
        self.assertEqual(error.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
