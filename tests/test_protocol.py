import unittest

from anipin.protocol import Frame, encode_frame, decode_frame


class FrameTests(unittest.TestCase):
    def test_empty_payload_matches_static_assembly(self):
        self.assertEqual(encode_frame(6, 0, 0, b''), bytes.fromhex('f1 06 00 00 00 00 00 00 09'))

    def test_big_endian_fields_and_checksum(self):
        frame = encode_frame(5, 0x1234, 0x5678, b'abc')
        self.assertEqual(frame[:-1], bytes.fromhex('f1 05 12 34 56 78 00 03 61 62 63'))
        self.assertEqual(sum(frame) & 0xff, 0)
        self.assertEqual(decode_frame(frame), Frame(5, 0x1234, 0x5678, b'abc'))

    def test_counter_order_observed_in_capture(self):
        frame = decode_frame(bytes.fromhex('f1 06 00 29 00 00 00 00 e0'))
        self.assertEqual((frame.total, frame.remaining), (41, 0))

    def test_payload_limit(self):
        self.assertEqual(len(encode_frame(6, 0, 1, bytes(496))), 505)
        with self.assertRaises(ValueError):
            encode_frame(6, 0, 1, bytes(497))

    def test_rejects_invalid_frames(self):
        valid = encode_frame(6, 0, 0, b'abc')
        for data in (b'', valid[:-1], valid + b'\x00', b'\x00' + valid[1:], valid[:-1] + bytes([valid[-1] ^ 1])):
            with self.subTest(data=data), self.assertRaises(ValueError):
                decode_frame(data)

    def test_invalid_fields(self):
        for args in ((-1, 0, 0), (256, 0, 0), (6, -1, 0), (6, 65536, 0), (6, 0, 65536)):
            with self.subTest(args=args), self.assertRaises(ValueError):
                encode_frame(*args, b'')


if __name__ == '__main__':
    unittest.main()

class PacketizationTests(unittest.TestCase):
    def test_counts_down_and_respects_write_size(self):
        from anipin.protocol import packetize
        frames = list(packetize(6, b'abcdefghij', max_write_size=13))
        decoded = [decode_frame(frame) for frame in frames]
        self.assertEqual([(f.total, f.remaining, f.payload) for f in decoded],
                         [(3, 2, b'abcd'), (3, 1, b'efgh'), (3, 0, b'ij')])
        self.assertTrue(all(len(frame) <= 13 for frame in frames))

    def test_rejects_invalid_sizes(self):
        from anipin.protocol import packetize
        for size in (9, 0, 506):
            with self.subTest(size=size), self.assertRaises(ValueError):
                list(packetize(6, b'a', max_write_size=size))
