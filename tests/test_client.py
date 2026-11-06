import unittest
from anipin.client import build_message

class MessageTests(unittest.TestCase):
    def test_still_and_animation_envelopes(self):
        self.assertEqual(build_message(6, b'abc'), b'{"type":6,"data":abc}')
        self.assertEqual(build_message(5, b'abc'), b'{"type":5,"data":abc}')

    def test_invalid_types_and_data(self):
        for kind, data in ((0, b'a'), (6, b''), (6, 'abc')):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                build_message(kind, data)
