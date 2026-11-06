import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('browser_setup', Path(__file__).parents[1] / 'scripts' / 'enable_web_bluetooth.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)

class BrowserSetupTests(unittest.TestCase):
    def test_preserves_other_flags_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            state = root / 'Local State'
            state.write_text(json.dumps({'browser': {'enabled_labs_experiments': ['other@1', setup.FLAG + '@2']}, 'keep': 7}))
            self.assertTrue(setup.enable(root))
            self.assertEqual(json.loads(state.read_text()), {'browser': {'enabled_labs_experiments': ['other@1', setup.FLAG]}, 'keep': 7})
            self.assertFalse(setup.enable(root))

    def test_refuses_active_profile(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            state = root / 'Local State'
            state.write_text('{}')
            (root / 'SingletonLock').symlink_to('running-123')
            with self.assertRaisesRegex(ValueError, 'Close'):
                setup.enable(root)
            self.assertEqual(state.read_text(), '{}')
            self.assertTrue(setup.enable(root, dry_run=True))
            self.assertEqual(state.read_text(), '{}')

    def test_windows_staging_failure_preserves_original(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            state = root / 'Local State'
            state.write_text('{}')
            with mock.patch.object(setup, '_is_windows', return_value=True), \
                 mock.patch.object(setup, '_copy_windows_acl', side_effect=OSError('ACL failed')):
                with self.assertRaisesRegex(OSError, 'ACL failed'):
                    setup.enable(root)
            self.assertEqual(state.read_text(), '{}')
            self.assertEqual(list(root.iterdir()), [state])

    def test_lockfile_blocks_changes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'Local State').write_text('{}')
            (root / 'lockfile').touch()
            with self.assertRaisesRegex(ValueError, 'Close'):
                setup.enable(root)

    def test_rejects_invalid_flags(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'Local State').write_text('{"browser":{"enabled_labs_experiments":"not an array"}}')
            with self.assertRaisesRegex(ValueError, 'string array'):
                setup.enable(root)

    def test_profile_discovery_on_linux_macos_and_windows(self):
        home = Path('/users/jay')
        self.assertEqual(setup.browser_candidates('chrome', system='Linux', environ={'XDG_CONFIG_HOME': '/config'}, home=home), [Path('/config/google-chrome')])
        self.assertEqual(setup.browser_candidates('chrome', system='Darwin', environ={}, home=home), [home / 'Library/Application Support/Google/Chrome'])
        self.assertEqual(setup.browser_candidates('helium', system='Darwin', environ={}, home=home), [home / 'Library/Application Support/net.imput.helium'])
        self.assertEqual(setup.browser_candidates('chrome', system='Windows', environ={'LOCALAPPDATA': '/local'}, home=home), [Path('/local/Google/Chrome/User Data')])
        self.assertEqual(setup.browser_candidates('helium', system='Windows', environ={'LOCALAPPDATA': '/local'}, home=home), [Path('/local/imput/Helium/User Data'), Path('/local/Helium/User Data')])

    def test_windows_discovery_requires_localappdata(self):
        with self.assertRaisesRegex(ValueError, 'LOCALAPPDATA'):
            setup.browser_candidates('chrome', system='Windows', environ={}, home=Path('/users/jay'))

    def test_detects_ambiguous_profiles(self):
        with tempfile.TemporaryDirectory() as temp:
            roots = [Path(temp) / 'first', Path(temp) / 'second']
            for root in roots:
                root.mkdir()
                (root / 'Local State').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'multiple'):
                setup.select_profile(roots)

if __name__ == '__main__':
    unittest.main()
