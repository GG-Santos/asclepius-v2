import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import type { Object3D } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

/** Parse an uploaded FBX/OBJ(+MTL) into a three.js Object3D (browser only). */
export async function parseModel(
  file: File,
  mtlFile?: File | null,
): Promise<Object3D> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "fbx") {
    return new FBXLoader().parse(await file.arrayBuffer(), "");
  }
  if (ext === "obj") {
    const loader = new OBJLoader();
    if (mtlFile) {
      const materials = new MTLLoader().parse(await mtlFile.text(), "");
      materials.preload();
      loader.setMaterials(materials);
    }
    return loader.parse(await file.text());
  }
  throw new Error("Unsupported file — upload a .fbx or .obj file.");
}

/** Export a three.js object to an optimized (meshopt) GLB File. */
export async function objectToGlb(object: Object3D): Promise<File> {
  const glb = (await new GLTFExporter().parseAsync(object, {
    binary: true,
  })) as ArrayBuffer;

  try {
    await MeshoptEncoder.ready;
    await MeshoptDecoder.ready;
    const io = new WebIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        "meshopt.decoder": MeshoptDecoder,
        "meshopt.encoder": MeshoptEncoder,
      });
    const doc = await io.readBinary(new Uint8Array(glb));
    await doc.transform(
      weld(),
      dedup(),
      prune(),
      meshopt({ encoder: MeshoptEncoder }),
    );
    const out = await io.writeBinary(doc);
    return new File([out as BlobPart], "model.glb", {
      type: "model/gltf-binary",
    });
  } catch {
    // Compression failed — the plain GLB still renders fine.
    return new File([glb], "model.glb", { type: "model/gltf-binary" });
  }
}

/**
 * Convert an uploaded FBX/OBJ into an optimized GLB, entirely in the browser.
 * Parsing untrusted models never touches the server.
 */
export async function convertToGlb(
  file: File,
  mtlFile?: File | null,
): Promise<File> {
  return objectToGlb(await parseModel(file, mtlFile));
}
