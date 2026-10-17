# Copyright 2023 Dixmit
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

import base64

from odoo.tests.common import HttpCase, tagged

from .common import SignOcaCommon


@tagged("post_install", "-at_install")
class TestSignPortal(SignOcaCommon, HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env["res.users"].with_context(no_reset_password=True).create(
            {
                "name": "Portal User",
                "login": "portal",
                "password": "portal",
                "group_ids": [(6, 0, [cls.env.ref("base.group_portal").id])],
            }
        )
        cls.signer = cls.env["res.partner"].create({"name": "Signer"})
        cls.request = cls.env["sign.oca.request"].create(
            {
                "data": cls.data,
                "name": "Demo template",
                "signer_ids": [
                    (
                        0,
                        0,
                        {
                            "partner_id": cls.signer.id,
                            "role_id": cls.role_customer.id,
                        },
                    )
                ],
            }
        )
        cls.item = cls.request.add_item(
            {
                "role_id": cls.role_customer.id,
                "field_id": cls.env.ref("sign_oca.sign_field_name").id,
                "page": 1,
                "position_x": 10,
                "position_y": 10,
                "width": 10,
                "height": 10,
            }
        )
        cls.request.action_send()
        cls.env.flush_all()
        cls.request.signer_ids.invalidate_recordset()

    def test_portal(self):
        self.authenticate("portal", "portal")
        self.url_open(self.request.signer_ids.access_url).raise_for_status()
        self.assertEqual(
            base64.b64decode(self.data),
            self.url_open(
                f"/sign_oca/content/{self.request.signer_ids.id}/{self.request.signer_ids.access_token}"
            ).content,
        )
        self.assertEqual(
            self.url_open(
                f"/sign_oca/info/{self.request.signer_ids.id}/{self.request.signer_ids.access_token}",
                data="{}",
                headers={"Content-Type": "application/json"},
            ).json()["result"]["items"][str(self.item["id"])],
            self.item,
        )
        data = {}
        for key in self.request.signer_ids.get_info()["items"]:
            val = self.request.signer_ids.get_info()["items"][key].copy()
            val["value"] = "My Name"
            data[key] = val

    def test_download_requires_completed_owned_request(self):
        self.authenticate("portal", "portal")
        url = f"/my/sign/{self.request.id}/download"
        self.assertEqual(self.url_open(url).status_code, 404)
        portal = self.env["res.users"].search([("login", "=", "portal")])
        signer = self.request.signer_ids
        signer.partner_id = portal.partner_id
        items = signer.get_info()["items"]
        for item in items.values():
            item["value"] = "Synthetic Portal Signer"
        signer.action_sign(items, access_token=signer.access_token)
        self.env.flush_all()
        response = self.url_open(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, self.request.data.content)
        signer.partner_id = self.signer
        self.env.flush_all()
        self.assertEqual(self.url_open(url).status_code, 404)

    def test_empty_iframe_script(self):
        response = self.url_open("/sign_oca/get_assets.js")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"")
