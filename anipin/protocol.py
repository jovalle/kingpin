"""Frame codec observed in Beambox 1.0.17 and older NN family assembly.

This module performs no Bluetooth I/O. The counter order and checksum were
verified against one Beambox still-image upload.
"""
from dataclasses import dataclass
import struct

MAX_PAYLOAD = 496
_HEADER = struct.Struct('>BBHHH')


@dataclass(frozen=True)
class Frame:
    command: int
    total: int
    remaining: int
    payload: bytes


def encode_frame(command: int, total: int, remaining: int, payload: bytes) -> bytes:
    for name, value, maximum in (('command', command, 255), ('total', total, 65535), ('remaining', remaining, 65535)):
        if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= maximum:
            raise ValueError(f'{name} must be an integer between 0 and {maximum}')
    if not isinstance(payload, bytes):
        raise ValueError('payload must be bytes')
    if len(payload) > MAX_PAYLOAD:
        raise ValueError(f'payload exceeds {MAX_PAYLOAD} bytes')
    body = _HEADER.pack(0xf1, command, total, remaining, len(payload)) + payload
    return body + bytes([(-sum(body)) & 0xff])


def decode_frame(data: bytes) -> Frame:
    if not isinstance(data, bytes) or len(data) < _HEADER.size + 1:
        raise ValueError('frame is too short or not bytes')
    marker, command, total, remaining, length = _HEADER.unpack_from(data)
    if marker != 0xf1 or length > MAX_PAYLOAD or len(data) != _HEADER.size + length + 1:
        raise ValueError('invalid frame marker or length')
    if sum(data) & 0xff:
        raise ValueError('invalid checksum')
    return Frame(command, total, remaining, data[_HEADER.size:-1])


def packetize(command: int, payload: bytes, *, max_write_size: int):
    """Split a message into frames sized for the negotiated BLE write limit."""
    if not isinstance(payload, bytes) or not payload:
        raise ValueError('payload must be nonempty bytes')
    if not isinstance(max_write_size, int) or isinstance(max_write_size, bool) or not 10 <= max_write_size <= MAX_PAYLOAD + 9:
        raise ValueError('max_write_size must be between 10 and 505')
    chunk_size = max_write_size - 9
    count = (len(payload) + chunk_size - 1) // chunk_size
    if count > 65535:
        raise ValueError('message requires too many frames')
    for index in range(count):
        yield encode_frame(command, count, count - index - 1,
                           payload[index * chunk_size:(index + 1) * chunk_size])
