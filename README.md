<p align="center">
  <img src="assets/kingpin-logo-badge.png" alt="Kingpin logo" width="300">
</p>

# Kingpin

A browser-based Ani-Pin editor. Images, GIFs and browser-supported videos are converted locally into the badge's 368 × 368 format. The preview supports repositioning and adjustable zoom. Animations are sampled at 10 frames per second and can be up to 60 seconds; audio is not transferred. Also supports stiching together two or more still images to create a looping animation.

## The Interface

Connect your badge using the Bluetooth controls, then choose an image, GIF, or video and adjust its position and zoom before sending.

| Home | Bluetooth settings | Badge information |
| --- | --- | --- |
| ![Disconnected home screen](public/screenshots/home.jpg) | ![Bluetooth settings while disconnected](public/screenshots/bluetooth.jpg) | ![Badge information while disconnected](public/screenshots/badge-settings.jpg) |

## Run locally

```sh
npm install
npm run dev
```

Open the local address printed by Vite. It starts at port 5464 (KING on a phone keypad) and automatically tries the next available port if that one is in use.

On Linux, macOS, and Windows, the repository helper can enable the experimental web-platform flag in most Chromium-based browsers (tested with Helium on Debian). Web Bluetooth is generally available without this flag on macOS and Windows; try it if your browser does not expose Bluetooth. The helper requires Node.js and Python 3.
