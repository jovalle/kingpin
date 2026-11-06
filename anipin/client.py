"""Experimental Beambox image transfer client.

Derived from one captured still and one animation upload. Device storage and
completion acknowledgement behavior remain unknown.
"""
import argparse
import asyncio
import io
import sys

from .media import pack_animation_jpegs, wrap_still_jpeg
from .protocol import packetize

WRITE_UUID = '000001f1-0000-1000-8000-00805f9b34fb'
NOTIFY_UUID = '000001f2-0000-1000-8000-00805f9b34fb'


def build_message(kind, data):
    if kind not in (5, 6) or not isinstance(data, bytes) or not data:
        raise ValueError('expected a nonempty still (6) or animation (5) payload')
    return b'{"type":' + str(kind).encode('ascii') + b',"data":' + data + b'}'


def prepare_image(path):
    from PIL import Image, ImageOps, ImageSequence
    with Image.open(path) as image:
        animated = getattr(image, 'n_frames', 1) > 1
        frames = []
        for frame in ImageSequence.Iterator(image):
            if animated and frame.info.get('duration', image.info.get('duration')) != 100:
                raise ValueError('animated input must have 100 ms per frame')
            picture = ImageOps.fit(frame.convert('RGB'), (368, 368), method=Image.Resampling.LANCZOS)
            output = io.BytesIO()
            picture.save(output, format='JPEG', quality=80)
            frames.append(output.getvalue())
    kind = 5 if animated else 6
    container = pack_animation_jpegs(frames) if animated else wrap_still_jpeg(frames[0])
    return kind, build_message(kind, container)


async def upload(address, kind, message):
    from bleak import BleakClient, BleakScanner
    device = await BleakScanner.find_device_by_address(address, timeout=20)
    if device is None:
        raise RuntimeError('badge not found; press its Bluetooth button once and retry')
    async with BleakClient(device, timeout=30) as client:
        characteristic = client.services.get_characteristic(WRITE_UUID)
        if characteristic is None or 'write-without-response' not in characteristic.properties:
            raise RuntimeError('badge is missing the expected write characteristic')
        await client.start_notify(NOTIFY_UUID, lambda _sender, _data: None)
        limit = min(455, characteristic.max_write_without_response_size)
        frames = list(packetize(kind, message, max_write_size=limit))
        print(f'Sending {len(frames)} packets, maximum write {limit} bytes.', flush=True)
        for index, frame in enumerate(frames, 1):
            await client.write_gatt_char(characteristic, frame, response=False)
            await asyncio.sleep(0.02)
            if index % 100 == 0 or index == len(frames):
                print(f'\r{index}/{len(frames)}', end='', flush=True)
        print('\nAll writes queued; physical display and completion are not verified.', flush=True)
        await asyncio.sleep(2)


def main():
    parser = argparse.ArgumentParser(description='Experimental Beambox BLE face uploader')
    parser.add_argument('address', help='BLE address of the badge')
    parser.add_argument('image', help='still image or 100-ms-per-frame GIF')
    args = parser.parse_args()
    try:
        kind, message = prepare_image(args.image)
        asyncio.run(upload(args.address, kind, message))
    except (ValueError, RuntimeError, OSError) as exc:
        print(f'Upload failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
