import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 25,
    },
  });

  app.post("/videos", async (req, res) => {
    const data = await req.file();

    if (!data) {
      return res.status(400).send({ error: "Missing file input." });
    }

    const extension = path.extname(data.filename);
    console.log(extension);

    if (extension !== ".mp3") {
      return res.status(400).send({
        error: "Invalid input type, please upload a MP3 file." + extension,
      });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const mp3FromVideo = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return res.status(200).send({ mp3FromVideo });
  });
}
