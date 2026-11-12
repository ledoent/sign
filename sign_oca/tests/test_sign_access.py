# Copyright 2026 Ledo Web Services
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo.exceptions import AccessError
from odoo.tests import tagged

from odoo.addons.base.tests.common import BaseCommon

from .common import SignOcaCommon


@tagged("post_install", "-at_install")
class TestSignAccess(SignOcaCommon, BaseCommon):
    """Record scoping on sign.oca.request for INTERNAL users.

    The portal side of this has its own tests in `test_sign_portal`. This file
    covers the other half, which is easy to leave untested because nothing
    about it fails loudly: an over-broad grant installs cleanly, passes every
    functional test, and is only visible if something asserts that the wrong
    person *cannot* read.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.request = cls.env["sign.oca.request"].create(
            {
                "data": cls.data,
                "name": "Access scoping demo",
                "signer_ids": [
                    (
                        0,
                        0,
                        {"partner_id": cls.partner.id, "role_id": cls.role_customer.id},
                    )
                ],
            }
        )
        cls.stranger = cls._internal_user("sign.stranger", [])
        cls.signer_user = cls._internal_user("sign.signeruser", [])
        cls.follower_user = cls._internal_user("sign.followeruser", [])
        cls.manager_user = cls._internal_user(
            "sign.manageruser", ["sign_oca.sign_oca_group_manager"]
        )
        cls.request.signer_ids.create(
            {
                "request_id": cls.request.id,
                "partner_id": cls.signer_user.partner_id.id,
                "role_id": cls.env.ref("sign_oca.sign_role_employee").id,
            }
        )
        cls.request.message_subscribe(cls.follower_user.partner_id.ids)

    @classmethod
    def _internal_user(cls, login, extra_groups):
        groups = [cls.env.ref("base.group_user").id]
        groups += [cls.env.ref(xmlid).id for xmlid in extra_groups]
        return (
            cls.env["res.users"]
            .with_context(no_reset_password=True)
            .create(
                {
                    "name": login,
                    "login": login,
                    "email": f"{login}@example.org",
                    "group_ids": [(6, 0, groups)],
                }
            )
        )

    def _can_read(self, user):
        return bool(
            self.env["sign.oca.request"]
            .with_user(user)
            .search_count([("id", "=", self.request.id)])
        )

    def test_stranger_cannot_read_request(self):
        """An internal user who neither follows nor signs sees nothing.

        Upstream grants base.group_user an unscoped read on this model, so
        every employee can read every signature request in the company --
        including the pdf in `data`. On an instance holding leases and
        counter-signed agreements that is the wrong default.
        """
        self.assertFalse(self._can_read(self.stranger))
        with self.assertRaises(AccessError):
            self.request.with_user(self.stranger).read(["name"])

    def test_signer_can_read_request(self):
        self.assertTrue(self._can_read(self.signer_user))

    def test_follower_can_read_request(self):
        self.assertTrue(self._can_read(self.follower_user))

    def test_manager_reads_every_request(self):
        """The scoping must not cost the manager group its read-all."""
        self.assertTrue(self._can_read(self.manager_user))

    def test_stranger_cannot_read_signer_rows(self):
        """The signer model is the other way to reach the same information."""
        self.assertFalse(
            self.env["sign.oca.request.signer"]
            .with_user(self.stranger)
            .search_count([("request_id", "=", self.request.id)])
        )
