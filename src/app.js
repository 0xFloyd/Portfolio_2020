import * as THREE from "three";
import { WEBGL } from "./WebGL";
import * as Ammo from "./builds/ammo";
import {
  billboardTextures,
  boxTexture,
  inputText,
  URL,
} from "./resources/textures";

import {
  setupEventHandlers,
  moveDirection,
  isTouchscreenDevice,
  touchEvent,
  createJoystick,
} from "./resources/eventHandlers";

import {
  preloadDivs,
  preloadOpactiy,
  postloadDivs,
  startScreenDivs,
  startButton,
  noWebGL,
} from "./resources/preload";

import {
  clock,
  scene,
  camera,
  renderer,
  stats,
  manager,
  createWorld,
  lensFlareObject,
  createLensFlare,
  particleGroup,
  particleAttributes,
  particleSystemObject,
  glowingParticles,
  addParticles,
  moveParticles,
} from "./resources/world";

import {
  simpleText,
  floatingLabel,
  allSkillsSection,
  createTextOnPlane,
} from "./resources/surfaces";

// start Ammo Engine
Ammo().then((Ammo) => {
  //Ammo.js variable declaration
  let rigidBodies = [],
    physicsWorld;

  //Ammo Dynamic  bodies vars for ball
  let ballObject = null;
  const STATE = { DISABLE_DEACTIVATION: 4 };
  const FLAGS = { CF_KINEMATIC_OBJECT: 2 };

  let tmpTrans = new Ammo.btTransform();
  let ammoTmpPos = new Ammo.btVector3();
  let ammoTmpQuat = new Ammo.btQuaternion();

  // list of hyperlink objects
  var objectsWithLinks = [];

  //holds computed Box3's
  var boxArrayTest = [];
  var ballObjectBox3; //box3 for the marble
  var ballComputeBoundingSphere;
  var ballComputeBoundingBox;
  var ballWireMesh;
  var interceptFlag = false;

  //start button pressed, person has entered 3d environment
  var startButtonPressed = false;
  var callOnceFlag = true; //boolean to only call on first render

  //function to create physics world with Ammo.js
  function createPhysicsWorld() {
    //algortihms for full (not broadphase) collision detection
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
      dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration), // dispatch calculations for overlapping pairs/ collisions.
      overlappingPairCache = new Ammo.btDbvtBroadphase(), //broadphase collision detection list of all possible colliding pairs
      constraintSolver = new Ammo.btSequentialImpulseConstraintSolver(); //causes the objects to interact properly, like gravity, game logic forces, collisions

    // see bullet physics docs for info
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      overlappingPairCache,
      constraintSolver,
      collisionConfiguration
    );

    // add gravity
    physicsWorld.setGravity(new Ammo.btVector3(0, -50, 0));
  }

  function renderFrame() {
    // FPS stats module
    stats.begin();

    let deltaTime = clock.getDelta();
    if (!isTouchscreenDevice())
      if (document.hasFocus()) {
        moveBall();
      } else {
        moveDirection.forward = 0;
        moveDirection.back = 0;
        moveDirection.left = 0;
        moveDirection.right = 0;
      }
    else {
      moveBall();
    }

    updatePhysics(deltaTime);

    moveParticles();

    renderer.render(scene, camera);
    stats.end();

    // tells browser theres animation, update before the next repaint
    requestAnimationFrame(renderFrame);
  }

  //loading page section
  function startButtonEventListener() {
    for (let i = 0; i < startScreenDivs.length; i++) {
      startScreenDivs[i].style.visibility = "hidden"; // or
      startScreenDivs[i].style.display = "none";
    }

    startButton.removeEventListener("click", startButtonEventListener);
    document.addEventListener("click", launchClickPosition);
    createBallMask();

    startButtonPressed = true;
  }

  startButton.addEventListener("click", startButtonEventListener);

  //create flat plane
  function createBlock() {
    // block properties
    let pos = { x: 0, y: -0.25, z: 0 };
    let scale = { x: 175, y: 0.5, z: 175 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    //grass ground
    /*
    var grass_loader = new THREE.TextureLoader();
    var groundTexture = grass_loader.load("./src/jsm/grasslight-small.jpg");
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(5, 5);
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;
    
    var material = new THREE.MeshPhysicalMaterial({
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      metalness: 0.9,
      roughness: 0.5,
      color: 0x0000ff,
      normalScale: new THREE.Vector2(0.15, 0.15),
    });*/

    var grid = new THREE.GridHelper(175, 20, 0xffffff, 0xffffff);
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    grid.position.y = 0.005;
    scene.add(grid);

    //Create Threejs Plane
    let blockPlane = new THREE.Mesh(
      new THREE.BoxBufferGeometry(),
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      })
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    //blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;
    scene.add(blockPlane);

    //Ammo.js Physics
    let transform = new Ammo.btTransform();
    transform.setIdentity(); // sets safe default values
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    //setup collision box
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    //  provides information to create a rigid body
    let rigidBodyStruct = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rigidBodyStruct);
    body.setFriction(10);
    body.setRollingFriction(10);

    // add to world
    physicsWorld.addRigidBody(body);
  }

  function createBox(
    x,
    y,
    z,
    scaleX,
    scaleY,
    scaleZ,
    boxTexture,
    URLLink,
    color = 0x000000,
    transparent = true
  ) {
    const boxScale = { x: scaleX, y: scaleY, z: scaleZ };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(boxTexture);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: transparent,
      color: 0xffffff,
    });

    var borderMaterial = new THREE.MeshBasicMaterial({
      color: color,
    });
    borderMaterial.color.convertSRGBToLinear();

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      materials
    );
    linkBox.position.set(x, y, z);
    linkBox.renderOrder = 1;
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    linkBox.userData = { URL: URLLink, email: URLLink };
    scene.add(linkBox);
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);
  }

  function ryanFloydWords(x, y, z) {
    const boxScale = { x: 46, y: 3, z: 2 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; //mass of zero = infinite mass

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      new THREE.MeshPhongMaterial({
        color: 0xff6600,
      })
    );
    linkBox.position.set(x, y, z);
    //linkBox.scale.set(boxScale.x, boxScale.y, boxScale.z);
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    //linkBox.userData = { URL: "https://ryanfloyd.io" };
    //scene.add(linkBox);
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);
  }

  function loadRyanText() {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
      var xMid, text;

      var color = 0x00ff08;

      var textMaterials = [
        new THREE.MeshPhongMaterial({ color: color }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var matLite = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
      });

      /*
      var message = "Ryan Floyd";

      var shapes = font.generateShapes(message, 1);
      */

      var geometry = new THREE.TextGeometry("RYAN FLOYD", {
        font: font,
        size: 3,
        height: 0.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.11,
        bevelOffset: 0,
        bevelSegments: 1,
      });

      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      geometry.translate(xMid, 0, 0);

      var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

      // make shape ( N.B. edge view not visible )

      text = new THREE.Mesh(geometry, textMaterials);
      text.position.z = -20;
      text.position.y = 0.1;
      text.receiveShadow = true;
      text.castShadow = true;
      scene.add(text);
    }); //end load function
  }

  function loadEngineerText() {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
      var xMid, text;

      var color = 0x00ff08;

      var textMaterials = [
        new THREE.MeshPhongMaterial({ color: color }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var matLite = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });

      /*
      var message = "Ryan Floyd";

      var shapes = font.generateShapes(message, 1);
      */

      var geometry = new THREE.TextGeometry("SOFTWARE ENGINEER", {
        font: font,
        size: 1.5,
        height: 0.5,
        curveSegments: 20,
        bevelEnabled: true,
        bevelThickness: 0.25,
        bevelSize: 0.1,
      });

      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      geometry.translate(xMid, 0, 0);

      var textGeo = new THREE.BufferGeometry().fromGeometry(geometry);

      // make shape ( N.B. edge view not visible )

      text = new THREE.Mesh(textGeo, textMaterials);
      text.position.z = -20;
      text.position.y = 0.1;
      text.position.x = 24;
      text.receiveShadow = true;
      text.castShadow = true;
      scene.add(text);
    }); //end load function
  }

  function createBillboard(
    x,
    y,
    z,
    textureImage = billboardTextures.grassImage,
    urlLink,
    rotation = 0
  ) {
    //const billboard = new THREE.Object3D();
    const billboardPoleScale = { x: 1, y: 5, z: 1 };
    const billboardSignScale = { x: 30, y: 15, z: 1 };
    const billboardPole = new THREE.Mesh(
      new THREE.BoxBufferGeometry(
        billboardPoleScale.x,
        billboardPoleScale.y,
        billboardPoleScale.z
      ),
      new THREE.MeshStandardMaterial({
        color: 0x878787,
      })
    );

    /* default texture loading */
    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(textureImage);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
    });

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];
    // order to add materials: x+,x-,y+,y-,z+,z-
    const billboardSign = new THREE.Mesh(
      new THREE.BoxGeometry(
        billboardSignScale.x,
        billboardSignScale.y,
        billboardSignScale.z
      ),
      materials
    );

    billboardPole.position.x = x;
    billboardPole.position.y = y;
    billboardPole.position.z = z;

    billboardSign.position.x = x;
    billboardSign.position.y = y + 10;
    billboardSign.position.z = z;

    /* Rotate Billboard */
    billboardPole.rotation.y = rotation;
    billboardSign.rotation.y = rotation;

    billboardPole.castShadow = true;
    billboardPole.receiveShadow = true;

    billboardSign.castShadow = true;
    billboardSign.receiveShadow = true;

    billboardSign.userData = { URL: urlLink };

    scene.add(billboardPole);
    scene.add(billboardSign);
    addRigidPhysics(billboardPole, billboardPoleScale);
    //addRigidPhysics(billboardSign, billboardSignScale);
  }

  function createBillboardRotated(
    x,
    y,
    z,
    textureImage = billboardTextures.grassImage,
    urlLink,
    rotation = 0
  ) {
    //const billboard = new THREE.Object3D();
    const billboardPoleScale = { x: 1, y: 2.5, z: 1 };
    const billboardSignScale = { x: 15, y: 20, z: 1 };
    const billboardPole = new THREE.Mesh(
      new THREE.BoxBufferGeometry(
        billboardPoleScale.x,
        billboardPoleScale.y,
        billboardPoleScale.z
      ),
      new THREE.MeshStandardMaterial({
        color: 0x878787,
      })
    );

    /* default texture loading */
    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(textureImage);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
    });

    var materials = [
      borderMaterial, // Left side
      borderMaterial, // Right side
      borderMaterial, // Top side   ---> THIS IS THE FRONT
      borderMaterial, // Bottom side --> THIS IS THE BACK
      loadedTexture, // Front side
      borderMaterial, // Back side
    ];
    // order to add materials: x+,x-,y+,y-,z+,z-
    const billboardSign = new THREE.Mesh(
      new THREE.BoxGeometry(
        billboardSignScale.x,
        billboardSignScale.y,
        billboardSignScale.z
      ),
      materials
    );

    billboardPole.position.x = x;
    billboardPole.position.y = y;
    billboardPole.position.z = z;

    billboardSign.position.x = x;
    billboardSign.position.y = y + 11.25;
    billboardSign.position.z = z;

    /* Rotate Billboard */
    billboardPole.rotation.y = rotation;
    billboardSign.rotation.y = rotation;

    billboardPole.castShadow = true;
    billboardPole.receiveShadow = true;

    billboardSign.castShadow = true;
    billboardSign.receiveShadow = true;

    billboardSign.userData = { URL: urlLink };

    scene.add(billboardPole);
    scene.add(billboardSign);
    addRigidPhysics(billboardPole, billboardPoleScale);
    addRigidPhysics(billboardSign, billboardSignScale);
  }

  function createWallX(x, y, z) {
    //const billboard = new THREE.Object3D();
    const wallScale = { x: 0.125, y: 4, z: 175 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.75,
        transparent: true,
      })
    );

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    //wall.rotation.y = Math.PI * 0.5;

    //wall.castShadow = true;
    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
    //addRigidPhysics(billboardSign, billboardSignScale);
  }

  function createWallZ(x, y, z) {
    //const billboard = new THREE.Object3D();
    const wallScale = { x: 175, y: 4, z: 0.125 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.75,
        transparent: true,
      })
    );

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    //wall.rotation.y = Math.PI * 0.5;

    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
  }

  function wallOfBricks() {
    var pos = new THREE.Vector3();
    var quat = new THREE.Quaternion();
    var brickMass = 0.1;
    var brickLength = 3;
    var brickDepth = 3;
    var brickHeight = 1.5;
    var numberOfBricksAcross = 6;
    var numberOfRowsHigh = 6;

    pos.set(70, brickHeight * 0.5, -60);
    quat.set(0, 0, 0, 1);

    for (var j = 0; j < numberOfRowsHigh; j++) {
      var oddRow = j % 2 == 1;

      pos.x = 60;

      if (oddRow) {
        pos.x += 0.25 * brickLength;
      }

      var currentRow = oddRow ? numberOfBricksAcross + 1 : numberOfBricksAcross;
      for (let i = 0; i < currentRow; i++) {
        var brickLengthCurrent = brickLength;
        var brickMassCurrent = brickMass;
        if (oddRow && (i == 0 || i == currentRow - 1)) {
          //first or last brick
          brickLengthCurrent *= 0.5;
          brickMassCurrent *= 0.5;
        }
        var brick = createParalellepiped(
          brickLengthCurrent,
          brickHeight,
          brickDepth,
          brickMassCurrent,
          pos,
          quat,
          new THREE.MeshLambertMaterial({
            color: 0xffffff,
          })
        );
        brick.castShadow = true;
        brick.receiveShadow = true;

        if (oddRow && (i == 0 || i == currentRow - 2)) {
          //first or last brick
          pos.x += brickLength * 0.25;
        } else {
          pos.x += brickLength;
        }
        pos.z += 0.0001;
      }
      pos.y += brickHeight;
    }
  }

  function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {
    var threeObject = new THREE.Mesh(
      new THREE.BoxBufferGeometry(sx, sy, sz, 1, 1, 1),
      material
    );
    var shape = new Ammo.btBoxShape(
      new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
    );
    shape.setMargin(0.05);

    createRigidBody(threeObject, shape, mass, pos, quat);

    return threeObject;
  }

  function createRigidBody(threeObject, physicsShape, mass, pos, quat) {
    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      physicsShape,
      localInertia
    );
    var body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    scene.add(threeObject);

    if (mass > 0) {
      rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
  }

  function addRigidPhysics(item, itemScale) {
    let pos = { x: item.position.x, y: item.position.y, z: item.position.z };
    let scale = { x: itemScale.x, y: itemScale.y, z: itemScale.z };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0;
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    var localInertia = new Ammo.btVector3(0, 0, 0);
    var motionState = new Ammo.btDefaultMotionState(transform);
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    colShape.setMargin(0.05);
    colShape.calculateLocalInertia(mass, localInertia);
    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);
    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(2);
    physicsWorld.addRigidBody(body);
  }

  // create ball
  function createBall() {
    let pos = { x: 8.75, y: 0, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 3;

    var marble_loader = new THREE.TextureLoader(manager);
    var marbleTexture = marble_loader.load("./src/jsm/earth.jpg");
    marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping;
    marbleTexture.repeat.set(1, 1);
    marbleTexture.anisotropy = 1;
    marbleTexture.encoding = THREE.sRGBEncoding;

    /*
    var material = new THREE.MeshPhysicalMaterial({
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      metalness: 0.9,
      roughness: 0.5,
      color: 0xffffff,
      opacity: 0.8,
      transparent: true,
      normalScale: new THREE.Vector2(0.15, 0.15),
    });*/

    //threeJS Section
    let ball = (ballObject = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: marbleTexture })
    ));

    ballComputeBoundingSphere = ball.geometry.computeBoundingSphere();
    ballComputeBoundingBox = ball.geometry.computeBoundingBox();

    ball.position.set(pos.x, pos.y, pos.z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);
    //body.setFriction(4);
    body.setRollingFriction(10);

    //set ball friction

    //once state is set to disable, dynamic interaction no longer calculated
    body.setActivationState(STATE.DISABLE_DEACTIVATION);

    physicsWorld.addRigidBody(
      body //collisionGroupRedBall, collisionGroupGreenBall | collisionGroupPlane
    );

    ball.userData.physicsBody = body;
    ballObject.userData.physicsBody = body;

    rigidBodies.push(ball);
    rigidBodies.push(ballObject);

    // currently testing 7/29/20: mesh surrounding ball
    /* sets orange box underneath ball to show position 
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      wireframe: true,
    });

    let wireMeshTemp = (ballWireMesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(4, 4),
      wireMaterial
    ));
    wireMeshTemp.position.y = 0.01;
    wireMeshTemp.rotation.x = -Math.PI * 0.5;
    //mesh.position.copy(ballObject.geometry.boundingSphere.center);
    scene.add(wireMeshTemp);*/
  }

  function createBallMask() {
    let pos = { x: 20, y: 30, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 20;

    var texture_loader = new THREE.TextureLoader(manager);
    var beachTexture = texture_loader.load("./src/jsm/BeachBallColor.jpg");
    beachTexture.wrapS = beachTexture.wrapT = THREE.RepeatWrapping;
    beachTexture.repeat.set(1, 1);
    beachTexture.anisotropy = 1;
    beachTexture.encoding = THREE.sRGBEncoding;

    //threeJS Section
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshLambertMaterial({ map: beachTexture })
    );

    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      colShape,
      localInertia
    );
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRollingFriction(1);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }

  function moveBall() {
    let scalingFactor = 20;
    let moveX = moveDirection.right - moveDirection.left;
    let moveZ = moveDirection.back - moveDirection.forward;
    let moveY = 0;

    if (ballObject.position.y < 2.01) {
      moveX = moveDirection.right - moveDirection.left;
      moveZ = moveDirection.back - moveDirection.forward;
      moveY = 0;
    } else {
      moveX = moveDirection.right - moveDirection.left;
      moveZ = moveDirection.back - moveDirection.forward;
      moveY = -0.25;
    }

    /*
    if (ballObject.position.y > 2.25) {
      moveY = -0.5;
    } else {
      moveY = 0;
    }*/

    // no movement
    if (moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
    resultantImpulse.op_mul(scalingFactor);
    let physicsBody = ballObject.userData.physicsBody;
    physicsBody.setLinearVelocity(resultantImpulse);
    return moveX, moveZ;
  }

  function updatePhysics(deltaTime) {
    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
      let objThree = rigidBodies[i];
      let objAmmo = objThree.userData.physicsBody;
      let ms = objAmmo.getMotionState();
      if (ms) {
        ms.getWorldTransform(tmpTrans);
        let p = tmpTrans.getOrigin();
        let q = tmpTrans.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
    if (ballObject.position.y < -50) {
      scene.remove(ballObject);
      createBall();
    }

    /* deprecated function for checking ball position to raise text 
    if (startButtonPressed) {
      checkForBallInsidePlane();
    } */

    //(x = -52), (z = 28);
    rotateCamera(ballObject);

    /* sets position for wire mesh under ball. currently disabled 8/3/20
    ballWireMesh.position.x = ballObject.position.x;
    ballWireMesh.position.z = ballObject.position.z;
    //ballWireMesh.position.set(ballObject.position);
    */

    //controls.update();
  }

  //start link events
  const pickPosition = { x: 0, y: 0 };

  function rotateCamera(ballPosition) {
    if (
      (ballPosition.position.x < 77 &&
        ballPosition.position.x > 42 &&
        ballPosition.position.z > -15 &&
        ballPosition.position.z < 40) ||
      (ballPosition.position.x < -2 && ballPosition.position.z < -39) ||
      (ballPosition.position.x < -30 &&
        ballPosition.position.x > -70 &&
        ballPosition.position.z > 0 &&
        ballPosition.position.z < 40)
    ) {
      camera.position.x = ballPosition.position.x;
      camera.position.y = ballPosition.position.y + 50;
      camera.position.z = ballPosition.position.z + 40;
      camera.lookAt(ballPosition.position);
    } else if (ballPosition.position.z > 60) {
      camera.position.x = ballPosition.position.x;
      camera.position.y = ballPosition.position.y + 10;
      camera.position.z = ballPosition.position.z + 40;
      camera.lookAt(ballPosition.position);
    } else {
      camera.position.x = ballPosition.position.x;
      camera.position.y = ballPosition.position.y + 30;
      camera.position.z = ballPosition.position.z + 60;
      camera.lookAt(ballPosition.position);
    }
  }

  function getCanvasRelativePosition(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * renderer.domElement.width) / rect.width,
      y:
        ((event.clientY - rect.top) * renderer.domElement.height) / rect.height,
    };
  }

  function launchClickPosition(event) {
    const pos = getCanvasRelativePosition(event);
    pickPosition.x = (pos.x / renderer.domElement.width) * 2 - 1;
    pickPosition.y = (pos.y / renderer.domElement.height) * -2 + 1; // note we flip Y

    // cast a ray through the frustum
    const myRaycaster = new THREE.Raycaster();
    myRaycaster.setFromCamera(pickPosition, camera);
    // get the list of objects the ray intersected
    const intersectedObjects = myRaycaster.intersectObjects(scene.children);
    if (intersectedObjects.length) {
      // pick the first object. It's the closest one
      const pickedObject = intersectedObjects[0].object;
      if (intersectedObjects[0].object.userData.URL)
        window.open(intersectedObjects[0].object.userData.URL);
      else {
        return;
      }
    }
  }

  //document loading

  manager.onStart = function (item, loaded, total) {
    console.log("Loading started");
  };

  manager.onLoad = function () {
    var readyStateCheckInterval = setInterval(function () {
      if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        for (let i = 0; i < preloadDivs.length; i++) {
          preloadDivs[i].style.visibility = "hidden"; // or
          preloadDivs[i].style.display = "none";
        }
        for (let i = 0; i < postloadDivs.length; i++) {
          postloadDivs[i].style.visibility = "visible"; // or
          postloadDivs[i].style.display = "block";
          preloadOpactiy.style.opacity = 0.9;
        }
      }
    }, 1000);
    console.log("Loading complete");
  };

  manager.onProgress = function (item, loaded, total) {
    //console.log(item, loaded, total);
  };

  manager.onError = function (url) {
    console.log("Error loading");
  };

  if (isTouchscreenDevice()) {
    createJoystick(document.getElementById("joystick-wrapper"));
    document.getElementById("joystick-wrapper").style.visibility = "visible";
    document.getElementById("joystick").style.visibility = "visible";
  }

  //initialize world and begin
  function start() {
    createWorld();
    createPhysicsWorld();

    createBlock();
    createBall();

    createWallX(87.5, 1.75, 0);
    createWallX(-87.5, 1.75, 0);
    createWallZ(0, 1.75, 87.5);
    createWallZ(0, 1.75, -87.5);

    createBillboard(
      -80,
      2.5,
      -70,
      billboardTextures.terpSolutionsTexture,
      URL.terpsolutions,
      Math.PI * 0.22
    );

    createBillboard(
      -45,
      2.5,
      -78,
      billboardTextures.bagHolderBetsTexture,
      URL.bagholderBets,
      Math.PI * 0.17
    );
    createBox(
      -39,
      2,
      -75,
      4,
      4,
      1,
      boxTexture.Github,
      URL.githubBagholder,
      0x000000,
      true
    );

    createBillboardRotated(
      -17,
      1.25,
      -75,
      billboardTextures.homeSweetHomeTexture,
      URL.homeSweetHomeURL,
      Math.PI * 0.15
    );
    createBox(
      -12,
      2,
      -73,
      4,
      4,
      1,
      boxTexture.Github,
      URL.githubHomeSweetHome,
      0x000000,
      true
    );

    ryanFloydWords(11.2, 1, -20);
    createTextOnPlane(-70, 0.01, -48, inputText.terpSolutionsText, 20, 40);
    createTextOnPlane(-42, 0.01, -53, inputText.bagholderBetsText, 20, 40);
    createTextOnPlane(-14, 0.01, -49, inputText.homeSweetHomeText, 20, 40);

    createBox(
      13,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.Github,
      URL.gitHub,
      0x000000,
      true
    );
    createBox(
      21,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.LinkedIn,
      URL.LinkedIn,
      0x0077b5,
      true
    );
    createBox(
      37,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.globe,
      URL.ryanfloyd,
      0xffffff,
      false
    );

    createBox(
      29,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.mail,
      "mailto:arfloyd7@gmail.com",
      0x000000,
      false
    );

    floatingLabel(13.125, 4.5, -70, "Github");
    floatingLabel(21.125, 4.5, -70, "LinkedIn");
    floatingLabel(28.875, 4.5, -70, "Email");
    floatingLabel(37, 4.5, -70, "Website");

    allSkillsSection(-50, 0.025, 20, 40, 40, boxTexture.allSkills);
    allSkillsSection(61, 0.025, 13, 30, 60, inputText.activities);

    //lensflare
    createLensFlare(50, -50, -800, 200, 200, boxTexture.lensFlareMain);

    loadRyanText();
    loadEngineerText();

    simpleText(
      8.75,
      0.01,
      5,
      "Use the arrow keys on your keyboard or\njoystick in the bottom left (touchscreen)\nto move around",
      1
    );
    simpleText(24, 0.01, -60, "Click boxes to visit", 1.5);
    simpleText(-50, 0.01, -5, "SKILLS", 3);
    simpleText(-42, 0.01, -30, "EXPERIENCE", 3);
    simpleText(61, 0.01, -15, "TIMELINE", 3);

    wallOfBricks();

    addParticles();
    glowingParticles();

    setupEventHandlers();
    renderFrame();
  }

  if (WEBGL.isWebGLAvailable()) {
    // Initiate function or other initializations here
    start();
  } else {
    noWebGL();
  }
});
