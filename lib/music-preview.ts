import { execFile } from "node:child_process";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const PREVIEW_SECONDS = 35;

export async function createMusicPreview(
  fullAudio: Buffer,
): Promise<Buffer> {
  if (
    fullAudio.length === 0 ||
    fullAudio.length > MAX_AUDIO_BYTES
  ) {
    throw new Error("O tamanho do áudio recebido é inválido.");
  }

  const isWindows = process.platform === "win32";

  if (!isWindows && process.platform !== "linux") {
    throw new Error("Sistema operacional de audio nao suportado.");
  }

  const binaryDirectory = path.join(
    process.cwd(),
    "tools",
    "ffmpeg",
    "bin",
  );

  const ffmpegPath = isWindows
    ? path.join(binaryDirectory, "ffmpeg.exe")
    : "ffmpeg";

  const ffprobePath = isWindows
    ? path.join(binaryDirectory, "ffprobe.exe")
    : "ffprobe";

  if (isWindows) {
    await Promise.all([
      access(ffmpegPath),
      access(ffprobePath),
    ]);
  } else {
    await Promise.all([
      execFileAsync(ffmpegPath, ["-version"], {
        timeout: 15000,
        windowsHide: true,
      }),
      execFileAsync(ffprobePath, ["-version"], {
        timeout: 15000,
        windowsHide: true,
      }),
    ]);
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "homenageando-preview-"),
  );

  const inputPath = path.join(temporaryDirectory, "original.mp3");
  const outputPath = path.join(temporaryDirectory, "preview.mp3");

  async function readDuration(filePath: string): Promise<number> {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        "-v", "error",
        "-protocol_whitelist", "file,pipe",
        "-f", "mp3",
        "-i", filePath,
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
      ],
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );

    const duration = Number(stdout.trim());

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Não foi possível validar a duração do áudio.");
    }

    return duration;
  }

  try {
    await writeFile(inputPath, fullAudio, { flag: "wx" });

    const originalDuration = await readDuration(inputPath);

    if (originalDuration < PREVIEW_SECONDS) {
      throw new Error("O áudio recebido é menor que o preview.");
    }

    await execFileAsync(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-nostdin",
        "-n",
        "-protocol_whitelist", "file,pipe",
        "-f", "mp3",
        "-i", inputPath,
        "-map", "0:a:0",
        "-t", String(PREVIEW_SECONDS),
        "-vn",
        "-map_metadata", "-1",
        "-map_chapters", "-1",
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        "-ar", "44100",
        "-ac", "2",
        outputPath,
      ],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );

    const previewDuration = await readDuration(outputPath);

    // Pequena tolerância para os quadros e o padding do formato MP3.
    if (
      previewDuration < PREVIEW_SECONDS - 0.2 ||
      previewDuration > PREVIEW_SECONDS + 0.2
    ) {
      throw new Error("A duração do preview gerado é inválida.");
    }

    const previewAudio = await readFile(outputPath);

    if (
      previewAudio.length === 0 ||
      previewAudio.length > 1024 * 1024
    ) {
      throw new Error("O arquivo de preview gerado é inválido.");
    }

    return previewAudio;
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
}