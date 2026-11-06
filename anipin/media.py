"""Offline still container observed in a Beambox 1.0.17 upload.

The 368-by-368 dimensions were observed in one upload; other device formats
have not been verified. This module does not communicate with the badge.
"""
import struct


def wrap_still_jpeg(jpeg: bytes) -> bytes:
    """Wrap JPEG bytes in the statically inferred IMB layout; no resizing."""
    if not isinstance(jpeg, bytes) or len(jpeg) < 4 or not jpeg.startswith(b'\xff\xd8') or not jpeg.endswith(b'\xff\xd9'):
        raise ValueError('expected JPEG bytes with SOI and EOI markers')
    if len(jpeg) > 0xffffffff - 32:
        raise ValueError('JPEG exceeds container size')
    return b'IMB\0' + struct.pack('<II BB HHH IIII', 4, len(jpeg) + 32, 11, 0, 0, 368, 368, 36, len(jpeg), 0, 0) + jpeg


def pack_animation_jpegs(frames):
    """Pack JPEGs in the observed 368-square, 100-ms animation format.

    This reproduces one captured Beambox animation; display compatibility for
    generated containers has not yet been tested. JPEGs are not resized.
    """
    frames = list(frames)
    if not frames or len(frames) > 99999:
        raise ValueError('expected between 1 and 99999 JPEG frames')
    for frame in frames:
        if not isinstance(frame, bytes) or len(frame) < 4 or not frame.startswith(b'\xff\xd8') or not frame.endswith(b'\xff\xd9'):
            raise ValueError('each frame must have JPEG SOI and EOI markers')
    offset = 32 + 16 * len(frames)
    offsets = []
    for frame in frames:
        offsets.append(offset)
        offset += 32 + len(frame)
    if offset > 0xffffffff:
        raise ValueError('animation container is too large')
    result = bytearray(struct.pack('<IIII', 0x12345678, 24 + 16 * len(frames), len(frames), 100))
    result += b'output/100ms' + struct.pack('<I', offset - 1)
    for i, location in enumerate(offsets, 1):
        result += f'frame_{i:05d}.'.encode('ascii') + struct.pack('<I', location)
    for i, frame in enumerate(frames):
        location = offsets[i]
        next_location = offsets[(i + 1) % len(offsets)]
        result += struct.pack('<IIIHHIIII', location, next_location, 11, 368, 368,
                              location + 32, len(frame), 0, 0)
        result += frame
    return bytes(result)
