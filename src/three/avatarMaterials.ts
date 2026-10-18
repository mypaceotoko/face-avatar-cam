import * as THREE from "three";
import { DEFAULT_SETTINGS, type AvatarSettings } from "../avatar/settings";

/** Original, texture-free palette. Vertex tint is a cheap diffuse skin approximation,
 * not screen-space or physical subsurface scattering. */
export function createAvatarMaterials(
  settings: AvatarSettings = DEFAULT_SETTINGS,
) {
  const skin = new THREE.MeshStandardMaterial({
    color: settings.skin,
    roughness: 0.78,
    metalness: 0,
    vertexColors: true,
  });
  const skinPlain = skin.clone();
  skinPlain.vertexColors = false;
  const hair = new THREE.MeshStandardMaterial({
    color: settings.hair,
    roughness: 0.58,
    metalness: 0,
    vertexColors: true,
  });
  const brow = new THREE.MeshStandardMaterial({
    color: settings.hair,
    roughness: 0.85,
  });
  const lip = new THREE.MeshStandardMaterial({
    color: new THREE.Color(settings.skin).lerp(
      new THREE.Color("#a54d59"),
      0.55,
    ),
    roughness: 0.65,
  });
  const mouth = new THREE.MeshBasicMaterial({
    color: "#32151f",
    side: THREE.DoubleSide,
  });
  const teeth = new THREE.MeshStandardMaterial({
    color: "#fff4e7",
    roughness: 0.4,
  });
  const tongue = new THREE.MeshStandardMaterial({
    color: "#b96873",
    roughness: 0.7,
  });
  const nostril = new THREE.MeshBasicMaterial({
    color: new THREE.Color(settings.skin).multiplyScalar(0.42),
  });
  const all = [nostril, skin, skinPlain, hair, brow, lip, mouth, teeth, tongue];
  return {
    nostril,
    skin,
    skinPlain,
    hair,
    brow,
    lip,
    mouth,
    teeth,
    tongue,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}
export type AvatarMaterials = ReturnType<typeof createAvatarMaterials>;
