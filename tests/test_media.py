import struct
import unittest
from anipin.media import wrap_still_jpeg


class StillContainerTests(unittest.TestCase):
    def test_static_layout(self):
        jpeg = bytes.fromhex('ff d8 ff d9')
        expected = b'IMB\0' + struct.pack('<II BB HHH IIII', 4, 36, 11, 0, 0, 368, 368, 36, 4, 0, 0) + jpeg
        self.assertEqual(wrap_still_jpeg(jpeg), expected)
        self.assertEqual(len(expected), 40)

    def test_rejects_non_jpeg(self):
        for invalid in (b'', b'not a jpeg', b'\xff\xd8bad'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                wrap_still_jpeg(invalid)

if __name__ == '__main__':
    unittest.main()

class AnimationContainerTests(unittest.TestCase):
    def test_two_frames_have_observed_table_and_offsets(self):
        from anipin.media import pack_animation_jpegs
        a, b = b'\xff\xd8a\xff\xd9', b'\xff\xd8bb\xff\xd9'
        packed = pack_animation_jpegs([a, b])
        self.assertEqual(struct.unpack_from('<IIII', packed), (0x12345678, 56, 2, 100))
        self.assertEqual(packed[16:28], b'output/100ms')
        self.assertEqual(struct.unpack_from('<I', packed, 28)[0], len(packed) - 1)
        self.assertEqual(packed[32:44], b'frame_00001.')
        self.assertEqual(struct.unpack_from('<I', packed, 44)[0], 64)
        self.assertEqual(struct.unpack_from('<II', packed, 64), (64, 101))
        self.assertEqual(packed[96:101], a)
        self.assertEqual(struct.unpack_from('<II', packed, 101), (101, 64))
        self.assertEqual(packed[133:], b)

    def test_rejects_empty_and_invalid_frames(self):
        from anipin.media import pack_animation_jpegs
        for frames in ([], [b'not jpeg']):
            with self.assertRaises(ValueError):
                pack_animation_jpegs(frames)
