import * as THREE from "three";
import { scene, manager } from "./world";

export function simpleText(x, y, z, inputText, fontSize) {
  var text_loader = new THREE.FontLoader();

  text_loader.load("../src/jsm/Roboto_Regular.json", function (font) {
    var xMid, text;

    var color = 0xffffff;

    var matLite = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    var message = inputText;

    var shapes = font.generateShapes(message, fontSize);

    var geometry = new THREE.ShapeBufferGeometry(shapes);

    geometry.computeBoundingBox();

    xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);

    // make shape ( N.B. edge view not visible )

    text = new THREE.Mesh(geometry, matLite);
    text.position.z = z;
    text.position.y = y;
    text.position.x = x;
    text.rotation.x = -Math.PI * 0.5;

    scene.add(text);
  });
}

export function floatingLabel(x, y, z, inputMessage) {
  var text_loader = new THREE.FontLoader();

  text_loader.load("../src/jsm/Roboto_Regular.json", function (font) {
    var xMid, text;

    var color = 0xffffff;

    var matLite = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    var message = inputMessage;

    var shapes = font.generateShapes(message, 1);

    var geometry = new THREE.ShapeBufferGeometry(shapes);

    geometry.computeBoundingBox();

    xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);

    // make shape ( N.B. edge view not visible )

    text = new THREE.Mesh(geometry, matLite);
    text.position.z = z;
    text.position.y = y;
    text.position.x = x;
    scene.add(text);
  });
}

export function allSkillsSection(
  x,
  y,
  z,
  xScale,
  zScale,
  boxTexture,
  URLLink = null
) {
  const boxScale = { x: xScale, y: 0.1, z: zScale };
  let quat = { x: 0, y: 0, z: 0, w: 1 };
  let mass = 0; //mass of zero = infinite mass

  var geometry = new THREE.PlaneBufferGeometry(xScale, zScale);

  const loader = new THREE.TextureLoader(manager);
  const texture = loader.load(boxTexture);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.encoding = THREE.sRGBEncoding;
  const loadedTexture = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  loadedTexture.depthWrite = true;
  loadedTexture.depthTest = true;

  const linkBox = new THREE.Mesh(geometry, loadedTexture);
  linkBox.position.set(x, y, z);
  linkBox.renderOrder = 1;
  linkBox.rotation.x = -Math.PI * 0.5;
  linkBox.receiveShadow = true;
  linkBox.userData = { URL: URLLink };
  scene.add(linkBox);
}

export function createTextOnPlane(x, y, z, inputText, size1, size2) {
  // word text
  var activitiesGeometry = new THREE.PlaneBufferGeometry(size1, size2);
  const loader = new THREE.TextureLoader(manager);
  var activitiesTexture = loader.load(inputText);
  activitiesTexture.magFilter = THREE.NearestFilter;
  activitiesTexture.minFilter = THREE.LinearFilter;
  var activitiesMaterial = new THREE.MeshBasicMaterial({
    alphaMap: activitiesTexture,
    transparent: true,
  });

  activitiesMaterial.depthWrite = true;
  activitiesMaterial.depthTest = true;
  let activitiesText = new THREE.Mesh(activitiesGeometry, activitiesMaterial);
  activitiesText.position.x = x;
  activitiesText.position.y = y;
  activitiesText.position.z = z;
  activitiesText.rotation.x = -Math.PI * 0.5;

  activitiesText.renderOrder = 1;

  scene.add(activitiesText);
}
