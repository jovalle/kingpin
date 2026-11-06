<div align="center">
  <a href="https://jovalle.github.io/kingpin/"><img src="assets/kingpin-logo-badge.png" alt="Kingpin" height="240"></a>

  <h1>Kingpin</h1>

  <p><strong>Your badge, your canvas</strong></p>

  <p>
    <a href="https://github.com/jovalle/kingpin/releases"><img src="https://img.shields.io/github/v/release/jovalle/kingpin?style=for-the-badge" alt="Release"></a>
    <a href="https://jovalle.github.io/kingpin/"><img src="https://img.shields.io/website?url=https%3A%2F%2Fjovalle.github.io%2Fkingpin%2F&style=for-the-badge&label=GitHub%20Pages" alt="GitHub Pages site status"></a>
    <a href="https://github.com/jovalle/kingpin/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/jovalle/kingpin/deploy.yml?branch=main&style=for-the-badge&label=build" alt="Build status"></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/Web%20Bluetooth-0082FC?style=for-the-badge&logo=bluetooth&logoColor=white" alt="Web Bluetooth">
    <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions">
  </p>
</div>

---

## <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif" height="24" alt=""> Overview

Kingpin is a browser-based editor for the Ani-Pin badge. Convert images, GIFs, and browser-supported videos into the badge's 368 × 368 format, preview the result, and send it over Bluetooth.

Media is processed locally in your browser and sent directly to the badge. It is not uploaded for processing.

## <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f3a8/512.gif" height="24" alt=""> Features

- 🖼️ **Images and animation** — Use still images, GIFs, or browser-supported videos.
- 🎞️ **Slideshow creator** — Combine two or more still images into a looping animation.
- 🔍 **Crop and preview** — Reposition and zoom before sending.
- 📡 **Direct Bluetooth transfer** — Connect to your badge from a supported browser.
- 🔒 **Local processing** — Animations are sampled at 10 frames per second, up to 60 seconds. Audio is not transferred.

## <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" height="24" alt=""> Quick Start

Open **[jovalle.github.io/kingpin](https://jovalle.github.io/kingpin/)**, connect your badge using the Bluetooth controls, and choose an image, GIF, or video.

Adjust its position and zoom before sending.

Web Bluetooth requires a supported browser and a secure context. Availability varies by browser and operating system.

## <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4f8/512.gif" height="24" alt=""> Screenshots

| Home                                                     | Bluetooth settings                                                         | Badge information                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Disconnected home screen](public/screenshots/home.jpg) | ![Bluetooth settings while disconnected](public/screenshots/bluetooth.jpg) | ![Badge information while disconnected](public/screenshots/badge-settings.jpg) |

## <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6e0_fe0f/512.gif" height="24" alt=""> Local Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. It starts at port 5464 (KING on a phone keypad) and automatically tries the next available port if that one is in use. Run `npm test` for the browser logic tests and `npm run build` for a production build.

On Linux, macOS, and Windows, the repository helper can enable the experimental web-platform flag in most Chromium-based browsers (tested with Helium on Debian). Web Bluetooth is generally available without this flag on macOS and Windows; try it if your browser does not expose Bluetooth. The helper requires Node.js and Python 3.

## <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4e6/512.gif" height="24" alt=""> Deployment and Releases

Pushes to `main` test and deploy the static site to GitHub Pages. Semantic releases are generated from conventional commits after a successful deployment. The release badge shows a version after the first release.
