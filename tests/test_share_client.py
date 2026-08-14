from __future__ import annotations

import contextlib
import importlib.util
import io
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).parents[1] / "skills" / "szeruj" / "scripts" / "share.py"
SPEC = importlib.util.spec_from_file_location("szeruj_share_client", SCRIPT)
assert SPEC and SPEC.loader
share = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = share
SPEC.loader.exec_module(share)


class GlobalConfigurationTests(unittest.TestCase):
    def test_linux_default_path(self) -> None:
        with (
            mock.patch.dict(os.environ, {}, clear=True),
            mock.patch.object(share.sys, "platform", "linux"),
            mock.patch.object(share.Path, "home", return_value=Path("/home/alice")),
        ):
            self.assertEqual(
                share.global_config_path(),
                Path("/home/alice/.config/szeruj/config.env"),
            )

    def test_macos_default_path(self) -> None:
        with (
            mock.patch.dict(os.environ, {}, clear=True),
            mock.patch.object(share.sys, "platform", "darwin"),
            mock.patch.object(share.Path, "home", return_value=Path("/Users/alice")),
        ):
            self.assertEqual(
                share.global_config_path(),
                Path("/Users/alice/Library/Application Support/szeruj/config.env"),
            )

    def test_windows_uses_appdata(self) -> None:
        with (
            mock.patch.dict(os.environ, {"APPDATA": "C:/Users/Alice/AppData/Roaming"}, clear=True),
            mock.patch.object(share.sys, "platform", "win32"),
        ):
            self.assertEqual(
                share.global_config_path(),
                Path("C:/Users/Alice/AppData/Roaming/szeruj/config.env"),
            )

    def test_explicit_path_has_priority(self) -> None:
        with mock.patch.dict(
            os.environ,
            {
                "SZERUJ_CONFIG_FILE": "~/private/szeruj.env",
                "XDG_CONFIG_HOME": "/ignored",
            },
            clear=True,
        ):
            self.assertEqual(
                share.global_config_path(),
                Path("~/private/szeruj.env").expanduser(),
            )

    def test_configure_writes_private_file_without_echoing_token(self) -> None:
        token = "a" * 48
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "config" / "config.env"
            output = io.StringIO()
            with (
                mock.patch.object(share.getpass, "getpass", return_value=token),
                mock.patch.object(share, "verify_url", return_value=(True, 200, None)),
                contextlib.redirect_stdout(output),
            ):
                result = share.configure_client(
                    target,
                    "http://szeruj.local:8369",
                    False,
                    1.0,
                    False,
                )

            self.assertEqual(result, 0)
            contents = target.read_text(encoding="utf-8")
            self.assertIn("SZERUJ_BASE_URL=http://szeruj.local:8369", contents)
            self.assertIn(f"SZERUJ_API_TOKEN={token}", contents)
            self.assertNotIn(token, output.getvalue())
            if os.name != "nt":
                self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)

    def test_configure_does_not_replace_existing_file_without_force(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "config.env"
            target.write_text("existing\n", encoding="utf-8")
            with mock.patch.object(share.getpass, "getpass") as prompt:
                with self.assertRaises(share.ShareError):
                    share.configure_client(
                        target,
                        "http://szeruj.local:8369",
                        False,
                        1.0,
                        False,
                    )
            prompt.assert_not_called()
            self.assertEqual(target.read_text(encoding="utf-8"), "existing\n")

    @unittest.skipUnless(hasattr(os, "symlink"), "symbolic links are unavailable")
    def test_configure_rejects_symbolic_link(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            real_target = root / "real.env"
            real_target.write_text("unchanged\n", encoding="utf-8")
            linked_target = root / "config.env"
            linked_target.symlink_to(real_target)
            with mock.patch.object(share.getpass, "getpass") as prompt:
                with self.assertRaises(share.ShareError):
                    share.configure_client(
                        linked_target,
                        "http://szeruj.local:8369",
                        True,
                        1.0,
                        False,
                    )
            prompt.assert_not_called()
            self.assertEqual(real_target.read_text(encoding="utf-8"), "unchanged\n")


if __name__ == "__main__":
    unittest.main()
