import unittest

from main import app
from routes.resources import READ_ONLY_TABLES, RESOURCE_TABLES


class ResourceRouteRegistrationTests(unittest.TestCase):
    def test_all_resource_route_groups_are_registered(self):
        paths = app.openapi()["paths"]

        for table_name in RESOURCE_TABLES:
            with self.subTest(table=table_name):
                prefix = "/" + table_name.replace("_", "-")
                self.assertIn(prefix + "/", paths)
                self.assertIn(prefix + "/{record_id}", paths)
                self.assertEqual(set(paths[prefix + "/"]), {"get"} if table_name in READ_ONLY_TABLES else {"get", "post"})
                expected_item_methods = {"get"} if table_name in READ_ONLY_TABLES else {"get", "put", "patch", "delete"}
                self.assertEqual(set(paths[prefix + "/{record_id}"]), expected_item_methods)

    def test_case_criminal_composite_key_routes_are_registered(self):
        paths = app.openapi()["paths"]
        self.assertEqual(set(paths["/case-criminals/"]), {"get", "post"})
        self.assertEqual(
            set(paths["/case-criminals/{case_id}/{criminal_id}"]),
            {"get", "put", "patch", "delete"},
        )

    def test_existing_case_lifecycle_routes_remain_registered(self):
        paths = app.openapi()["paths"]
        required_paths = {
            "/cases/",
            "/cases/{case_id}",
            "/cases/{case_id}/timeline",
            "/cases/{case_id}/details",
        }
        self.assertTrue(required_paths.issubset(paths))


if __name__ == "__main__":
    unittest.main()
