import * as THREE from "three";
import Stats from "stats.js";
import { OrbitControls } from "./OrbitControls";
import { GLTFLoader } from "./GLTFLoader";
import { THREEx } from "./THREEx.KeyboardState";
import TWEEN, { Tween } from "@tweenjs/tween.js";
//import Ammo from "ammo.js";
import * as Ammo from "./builds/ammo";
//import { text } from "express";
//import { TWEEN } from "@tweenjs/tween.js";
import { Lensflare, LensflareElement } from "./jsm/Lensflare";
// start Ammo Engine
Ammo().then((Ammo) => {
  //threejs variable declaration
  var clock, scene, camera, renderer, stats, particleSystemObject;

  var particleDirection = true;
  //Ammo.js variable declaration
  var rigidBodies = [],
    tmpTrans,
    ammoTmpPos,
    ammoTmpQuat,
    physicsWorld;

  //Ammo.js collision groups
  let collisionGroupPlane = 1,
    collisionGroupRedBall = 2,
    collisionGroupGreenBall = 4;

  //Ammo Dynamic  bodies vars for ball
  let ballObject = null,
    moveDirection = { left: 0, right: 0, forward: 0, back: 0 };
  const STATE = { DISABLE_DEACTIVATION: 4 };

  //ammo kinematic  body block vars
  let kObject = null,
    kMoveDirection = { left: 0, right: 0, forward: 0, back: 0 },
    tmpPos = new THREE.Vector3(),
    tmpQuat = new THREE.Quaternion();
  const FLAGS = { CF_KINEMATIC_OBJECT: 2 };

  // list of hyperlink objects
  var objectsWithLinks = [];
  var objectsWithoutLinks = [];

  //billboardTextures

  let billboardTextures = {};
  billboardTextures.terpSolutionsTexture = "./src/jsm/terpSolutions.png";
  billboardTextures.grassImage = "./src/jsm/grasslight-small.jpg";

  //text
  let inputText = {};
  inputText.terpSolutionsText = "./src/jsm/terp-solutions-text.png";
  inputText.testText = "./src/jsm/test-text.png";

  //URLs

  let URL = {};
  URL.terpsolutions = "https://terpsolutions.com/";
  URL.ryanfloyd = "https://ryanfloyd.io";

  //function to create physics world
  function initPhysicsWorld() {
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

  // use Three.js to set up graphics
  function initGraphics() {
    clock = new THREE.Clock();

    // init new Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // camera
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      5000
    );
    camera.position.set(0, 30, 70);
    camera.lookAt(scene.position);

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
    hemiLight.color.setHSL(0.6, 0.6, 0.6);
    hemiLight.groundColor.setHSL(0.1, 1, 0.4);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    //Add directional light
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(20, 100, -20);
    dirLight.position.multiplyScalar(100);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;

    let d = 200;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    dirLight.shadow.camera.far = 13500;

    //Setup the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    stats = new Stats();
    document.body.appendChild(stats.dom);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;
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

    moveKinematic();
    updatePhysics(deltaTime);

    moveParticles();

    renderer.render(scene, camera);
    stats.end();
    // tells browser theres animation, update before the next repaint
    requestAnimationFrame(renderFrame);
  }

  // create keyboard control event listeners
  function setupEventHandlers() {
    window.addEventListener("keydown", handleKeyDown, false);
    window.addEventListener("keyup", handleKeyUp, false);
  }

  function handleKeyDown(event) {
    let keyCode = event.keyCode;

    switch (keyCode) {
      case 87: //W: FORWARD
      case 38: //up arrow
        moveDirection.forward = 1;
        break;

      case 83: //S: BACK
      case 40: //down arrow
        moveDirection.back = 1;
        break;

      case 65: //A: LEFT
      case 37: //left arrow
        moveDirection.left = 1;
        break;

      case 68: //D: RIGHT
      case 39: //right arrow
        moveDirection.right = 1;
        break;
      /*
      case 38: //↑: FORWARD
        kMoveDirection.forward = 1;
        break;

      case 40: //↓: BACK
        kMoveDirection.back = 1;
        break;

      case 37: //←: LEFT
        kMoveDirection.left = 1;
        break;

      case 39: //→: RIGHT
        kMoveDirection.right = 1;
        break;

      case 82: //→: RESET
        break;*/
    }
  }

  function handleKeyUp(event) {
    let keyCode = event.keyCode;

    switch (keyCode) {
      case 87: //FORWARD
      case 38:
        moveDirection.forward = 0;
        break;

      case 83: //BACK
      case 40:
        moveDirection.back = 0;
        break;

      case 65: //LEFT
      case 37:
        moveDirection.left = 0;
        break;

      case 68: //RIGHT
      case 39:
        moveDirection.right = 0;
        break;
    }
  }

  //document loading
  var manager = new THREE.LoadingManager();

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

  /*
  //const joystick = createJoystick(document.getElementById("joystick-wrapper"));
   if (isTouchscreenDevice()) {
      createJoystick(document.getElementById("joystick-wrapper"));
      document.getElementById("joystick-wrapper").style.visibility = "visible";
     document.getElementById("joystick").style.visibility = "visible";
    }*/

  //setInterval(() => console.log(joystick.getPosition()), 1000);

  function isTouchscreenDevice() {
    let supportsTouch = false;
    if ("ontouchstart" in window)
      // iOS & android
      supportsTouch = true;
    else if (window.navigator.msPointerEnabled)
      // Win8
      supportsTouch = true;
    else if ("ontouchstart" in document.documentElement)
      // Controversial way to check touch support
      supportsTouch = true;

    if (supportsTouch) {
      console.log("touch device");
    } else {
      console.log("not touch device");
    }
    return supportsTouch;
  }

  const joystick = createJoystick(document.getElementById("joystick-wrapper"));

  function createJoystick(parent) {
    const maxDiff = 62; //how far drag can go
    const stick = document.createElement("div");
    //stick.classList.add("joystick");
    stick.setAttribute("id", "joystick");

    stick.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    stick.addEventListener("touchstart", handleMouseDown);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);

    let dragStart = null;
    let currentPos = { x: 0, y: 0 };

    function handleMouseDown(event) {
      stick.style.transition = "0s";

      if (event.changedTouches) {
        dragStart = {
          x: event.changedTouches[0].clientX,
          y: event.changedTouches[0].clientY,
        };

        return;
      }
      dragStart = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    function handleMouseMove(event) {
      if (dragStart === null) return;

      //console.log("entered handleMouseMove");
      if (event.changedTouches) {
        event.clientX = event.changedTouches[0].clientX;
        event.clientY = event.changedTouches[0].clientY;
        //touchEvent(currentPos);
      }

      const xDiff = event.clientX - dragStart.x;
      const yDiff = event.clientY - dragStart.y;
      const angle = Math.atan2(yDiff, xDiff);
      const distance = Math.min(maxDiff, Math.hypot(xDiff, yDiff));
      const xNew = distance * Math.cos(angle);
      const yNew = distance * Math.sin(angle);
      stick.style.transform = `translate3d(${xNew}px, ${yNew}px, 0px)`;
      currentPos = { x: xNew, y: yNew };
      touchEvent(currentPos);
    }

    function handleMouseUp(event) {
      if (dragStart === null) return;
      stick.style.transition = ".2s";
      stick.style.transform = `translate3d(0px, 0px, 0px)`;
      dragStart = null;
      currentPos = { x: 0, y: 0 };
      moveDirection.forward = 0;
      moveDirection.left = 0;
      moveDirection.right = 0;
      moveDirection.back = 0;
    }

    parent.appendChild(stick);
    return {
      getPosition: () => currentPos,
    };
  }

  function touchEvent(coordinates) {
    if (coordinates.x > 30) {
      moveDirection.right = 1;
      moveDirection.left = 0;
    } else if (coordinates.x < -30) {
      moveDirection.left = 1;
      moveDirection.right = 0;
    } else {
      moveDirection.right = 0;
      moveDirection.left = 0;
    }

    if (coordinates.y > 30) {
      moveDirection.back = 1;
      moveDirection.forward = 0;
    } else if (coordinates.y < -30) {
      moveDirection.forward = 1;
      moveDirection.back = 0;
    } else {
      moveDirection.forward = 0;
      moveDirection.back = 0;
    }
  }

  let preloadDivs = document.getElementsByClassName("preload");
  let preloadOpactiy = document.getElementById("preload-overlay");
  let postloadDivs = document.getElementsByClassName("postload");
  let startScreenDivs = document.getElementsByClassName("start-screen");
  let startButton = document.getElementById("start-button");

  //loading page section
  function startButtonEventListener() {
    for (let i = 0; i < startScreenDivs.length; i++) {
      startScreenDivs[i].style.visibility = "hidden"; // or
      startScreenDivs[i].style.display = "none";
    }

    startButton.removeEventListener("click", startButtonEventListener);
    document.addEventListener("click", launchClickPosition);
    createBallMask();
  }

  startButton.addEventListener("click", startButtonEventListener);

  if (isTouchscreenDevice()) {
    document.getElementById("joystick-wrapper").style.visibility = "visible";
    document.getElementById("joystick").style.visibility = "visible";
  }

  /*

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
  }, 1500);*/

  //create flat plane
  function createBlock() {
    // block properties
    let pos = { x: 0, y: -2.5, z: 0 };
    let scale = { x: 200, y: 5, z: 200 };
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

    var grid = new THREE.GridHelper(200, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.075;
    grid.material.transparent = true;
    scene.add(grid);

    //Create Threejs Plane
    let blockPlane = new THREE.Mesh(
      new THREE.BoxBufferGeometry(),
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
      })
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    blockPlane.castShadow = true;
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
    body.setFriction(4);
    body.setRollingFriction(10);

    // add to world
    physicsWorld.addRigidBody(body);
  }

  function createTextOnPlane(x, y, z, inputText) {
    // word text
    var activitiesGeometry = new THREE.PlaneBufferGeometry(20, 20);
    const loader = new THREE.TextureLoader(manager);
    var activitiesTexture = loader.load(inputText);
    activitiesTexture.magFilter = THREE.NearestFilter;
    activitiesTexture.minFilter = THREE.LinearFilter;
    var activitiesMaterial = new THREE.MeshBasicMaterial({
      wireframe: false,
      color: 0x000000,
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
    activitiesText.matrixAutoUpdate = false;
    activitiesText.updateMatrix();
    activitiesText.renderOrder = 1;
    scene.add(activitiesText);
  }

  function createBox(x, y, z) {
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
        new THREE.MeshPhongMaterial({ color: color, flatShading: true }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var matLite = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });

      /*
      var message = "Ryan Floyd";

      var shapes = font.generateShapes(message, 1);
      */

      var geometry = new THREE.TextGeometry("RYAN FLOYD", {
        font: font,
        size: 3,
        height: 0.5,
        curveSegments: 20,
        bevelEnabled: true,
        bevelThickness: 0.5,
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
        new THREE.MeshPhongMaterial({ color: color, flatShading: true }), // front
        new THREE.MeshPhongMaterial({ color: color }), // side
      ];

      var matLite = new THREE.MeshBasicMaterial({
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
    urlLink
  ) {
    //const billboard = new THREE.Object3D();
    const billboardPoleScale = { x: 1, y: 10, z: 1 };
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
    billboardSign.position.y = y + 12.5;
    billboardSign.position.z = z;

    /* Rotate Billboard */
    billboardPole.rotation.y = Math.PI * 0.22;
    billboardSign.rotation.y = Math.PI * 0.2;

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

  function createWallX(x, y, z) {
    //const billboard = new THREE.Object3D();
    const wallScale = { x: 0, y: 10, z: 200 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0x878787,
      })
    );

    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    //wall.rotation.y = Math.PI * 0.5;

    wall.castShadow = true;
    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
    //addRigidPhysics(billboardSign, billboardSignScale);
  }

  function createWallZ(x, y, z) {
    //const billboard = new THREE.Object3D();
    const wallScale = { x: 200, y: 10, z: 0 };

    const wall = new THREE.Mesh(
      new THREE.BoxBufferGeometry(wallScale.x, wallScale.y, wallScale.z),
      new THREE.MeshStandardMaterial({
        color: 0x878787,
      })
    );

    var borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });

    wall.position.x = x;
    wall.position.y = y;
    wall.position.z = z;

    //wall.rotation.y = Math.PI * 0.5;

    wall.castShadow = true;
    wall.receiveShadow = true;

    scene.add(wall);

    addRigidPhysics(wall, wallScale);
    //addRigidPhysics(billboardSign, billboardSignScale);
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
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);
    physicsWorld.addRigidBody(body);
  }

  // create ball
  function createBall() {
    let pos = { x: 0, y: 0, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 5;

    var marble_loader = new THREE.TextureLoader(manager);
    var marbleTexture = marble_loader.load("./src/jsm/marble_skin.png");
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
    body.setFriction(4);
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
  }

  function createBallMask() {
    let pos = { x: 20, y: 30, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 15;

    //ThreeJS create ball
    let ball = new THREE.Mesh(
      new THREE.SphereBufferGeometry(2, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x0000ff })
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

    body.setRollingFriction(10);
    physicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
  }

  function moveBall() {
    let scalingFactor = 15;
    let moveX = moveDirection.right - moveDirection.left;
    let moveZ = moveDirection.back - moveDirection.forward;
    let moveY = 0;

    // no movement
    if (moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
    resultantImpulse.op_mul(scalingFactor);
    let physicsBody = ballObject.userData.physicsBody;
    physicsBody.setLinearVelocity(resultantImpulse);
  }

  function createKinematicBox() {
    let pos = { x: 70, y: 0, z: 5 };
    let scale = { x: 10, y: 10, z: 10 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0;

    //threeJS Section
    kObject = new THREE.Mesh(
      new THREE.BoxBufferGeometry(),
      new THREE.MeshPhongMaterial({ color: 0x30ab78 })
    );

    kObject.position.set(pos.x, pos.y, pos.z);
    kObject.scale.set(scale.x, scale.y, scale.z);

    kObject.castShadow = true;
    kObject.receiveShadow = true;

    scene.add(kObject);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
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

    body.setFriction(4);
    body.setRollingFriction(10);

    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);

    physicsWorld.addRigidBody(body);
    kObject.userData.physicsBody = body;
  }

  function moveKinematic() {
    let scalingFactor = 0.3;

    let moveX = kMoveDirection.right - kMoveDirection.left;
    let moveZ = kMoveDirection.back - kMoveDirection.forward;
    let moveY = 0;

    let translateFactor = tmpPos.set(moveX, moveY, moveZ);

    translateFactor.multiplyScalar(scalingFactor);

    kObject.translateX(translateFactor.x);
    kObject.translateY(translateFactor.y);
    kObject.translateZ(translateFactor.z);

    kObject.getWorldPosition(tmpPos);
    kObject.getWorldQuaternion(tmpQuat);

    let physicsBody = kObject.userData.physicsBody;

    let ms = physicsBody.getMotionState();
    if (ms) {
      ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
      ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);

      tmpTrans.setIdentity();
      tmpTrans.setOrigin(ammoTmpPos);
      tmpTrans.setRotation(ammoTmpQuat);

      ms.setWorldTransform(tmpTrans);
    }
  }

  function createJointObjects() {
    let pos1 = { x: 70, y: 15, z: 0 };
    let pos2 = { x: 70, y: 10, z: 0 };

    let radius = 2;
    let scale = { x: 5, y: 2, z: 2 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass1 = 0;
    let mass2 = 1;

    let transform = new Ammo.btTransform();

    //Sphere Graphics
    let ball = new THREE.Mesh(
      new THREE.SphereBufferGeometry(radius),
      new THREE.MeshPhongMaterial({ color: 0xb846db })
    );

    ball.position.set(pos1.x, pos1.y, pos1.z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Sphere Physics
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos1.x, pos1.y, pos1.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let sphereColShape = new Ammo.btSphereShape(radius);
    sphereColShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    sphereColShape.calculateLocalInertia(mass1, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass1,
      motionState,
      sphereColShape,
      localInertia
    );
    let sphereBody = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(
      sphereBody,
      collisionGroupGreenBall,
      collisionGroupRedBall
    );

    ball.userData.physicsBody = sphereBody;
    rigidBodies.push(ball);

    //Block Graphics
    let block = new THREE.Mesh(
      new THREE.BoxBufferGeometry(),
      new THREE.MeshPhongMaterial({ color: 0xf78a1d })
    );

    block.position.set(pos2.x, pos2.y, pos2.z);
    block.scale.set(scale.x, scale.y, scale.z);

    block.castShadow = true;
    block.receiveShadow = true;

    scene.add(block);

    //Block Physics
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos2.x, pos2.y, pos2.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    motionState = new Ammo.btDefaultMotionState(transform);

    let blockColShape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    blockColShape.setMargin(0.05);

    localInertia = new Ammo.btVector3(0, 0, 0);
    blockColShape.calculateLocalInertia(mass2, localInertia);

    rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass2,
      motionState,
      blockColShape,
      localInertia
    );
    let blockBody = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(
      blockBody,
      collisionGroupGreenBall,
      collisionGroupRedBall
    );

    block.userData.physicsBody = blockBody;
    rigidBodies.push(block);

    //Create Joints
    let spherePivot = new Ammo.btVector3(0, -radius, 0);
    let blockPivot = new Ammo.btVector3(-scale.x * 0.5, 0, 0);

    let p2p = new Ammo.btPoint2PointConstraint(
      sphereBody,
      blockBody,
      spherePivot,
      blockPivot
    );
    physicsWorld.addConstraint(p2p, false);
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

    camera.position.x = ballObject.position.x;
    camera.position.y = ballObject.position.y + 15;
    camera.position.z = ballObject.position.z + 50;
    camera.lookAt(ballObject.position);
  }

  //start link events
  const pickPosition = { x: 0, y: 0 };

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

  function createTriangle(x, z) {
    var geom = new THREE.Geometry();
    var v1 = new THREE.Vector3(4, 0, 0);
    var v2 = new THREE.Vector3(5, 0, 0);
    var v3 = new THREE.Vector3(4.5, 1, 0);

    geom.vertices.push(v1);
    geom.vertices.push(v2);
    geom.vertices.push(v3);

    geom.faces.push(new THREE.Face3(0, 1, 2));
    geom.computeFaceNormals();

    var mesh = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({ color: 0x9c9c9c })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.rotation.z = Math.PI * 0.5;
    mesh.position.y = 0.1;
    mesh.position.x = x;
    mesh.position.z = z;
    scene.add(mesh);
  }

  function createAllTriangles() {
    createTriangle(-13, 5);
  }

  function skyBoxTest() {
    let materialArray = [];
    let texture1 = new THREE.TextureLoader().load(
      "./src/jsm/dispair-ridge_front.png"
    );
    let texture2 = new THREE.TextureLoader().load(
      "./src/jsm/dispair-ridge_back.png"
    );
    let texture3 = new THREE.TextureLoader().load(
      "./src/jsm/dispair-ridge_up.png"
    );
    let texture4 = new THREE.TextureLoader().load(
      "./src/jsm/dispair-ridge_down.png"
    );
    let texture5 = new THREE.TextureLoader().load(
      "./src/jsm/dispair-ridge_right.png"
    );
    let texture6 = new THREE.TextureLoader().load(
      "./src/jsm/dispair-ridge_left.png"
    );

    materialArray.push(new THREE.MeshBasicMaterial({ map: texture1 }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture2 }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture3 }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture4 }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture5 }));
    materialArray.push(new THREE.MeshBasicMaterial({ map: texture6 }));

    for (let i = 0; i < 6; i++) {
      materialArray[i].side = THREE.BackSide;
      materialArray[i].map.minFilter = THREE.LinearMipMapLinearFilter;
      //materialArray[i].map.magFilter = THREE.LinearFilter;
      materialArray[i].map.anisotropy = renderer.getMaxAnisotropy();
    }

    let skyBoxGeo = new THREE.BoxGeometry(500, 500, 500);
    let skyBox = new THREE.Mesh(skyBoxGeo, materialArray);
    //skyBox.scale.set(3, 3, 3);
    //skyBox.position.y = -200;
    scene.add(skyBox);
  }

  function skyBoxSphere() {
    var geometry = new THREE.SphereGeometry(100, 25, 25);

    var material = new THREE.MeshLambertMaterial({
      map: galaxyTexture,
    });

    material.map.minFilter = THREE.LinearFilter;

    var skyBox = new THREE.Mesh(geometry, material);

    skyBox.material.side = THREE.DoubleSide;
    //skyBox.position.z = 0;

    scene.add(skyBox);
  }

  function lensFlare() {
    var textureLoader = new THREE.TextureLoader(manager);

    var textureFlare0 = textureLoader.load("./src/jsm/lensflare0.png");
    //var textureFlare3 = textureLoader.load("./src/jsm/lensflare3.png");

    textureFlare0.disableLighting = true;
    //textureFlare3.disableLighting = true;

    addLight(0.55, 0.9, 0.5, 100, 50, -500);
    addLight(0.08, 0.8, 0.5, 100, 50, -500);
    addLight(0.995, 0.5, 0.9, 100, 50, -500);

    function addLight(h, s, l, x, y, z) {
      var light = new THREE.PointLight(0xffffff, 0, 2);
      light.color.setHSL(h, s, l);
      light.position.set(x, y, z);
      scene.add(light);

      var lensflare = new Lensflare();
      lensflare.addElement(
        new LensflareElement(textureFlare0, 700, 0, light.color)
      );

      //lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
      //lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
      //lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
      //lensflare.addElement(new LensflareElement(textureFlare3, 70, 1));
      lensflare.disableLighting = true;
      light.add(lensflare);
    }
  }

  function addParticles() {
    var geometry = new THREE.Geometry();

    for (let i = 0; i < 3000; i++) {
      var vertex = new THREE.Vector3();
      vertex.x = getRandomArbitrary(-1000, 1000);
      vertex.y = getRandomArbitrary(-1000, 1000);
      vertex.z = getRandomArbitrary(-1000, -500);
      geometry.vertices.push(vertex);
    }

    var material = new THREE.PointsMaterial({ size: 3 });
    particleSystemObject = new THREE.Points(geometry, material);

    scene.add(particleSystemObject);
  }

  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }

  function moveParticles() {
    particleSystemObject.rotation.z += 0.0003;
  }

  function semiCircleDome() {
    var sphere = new THREE.SphereBufferGeometry(
      100,
      16,
      6,
      0,
      2 * Math.PI,
      0,
      0.5 * Math.PI
    );
    let ball = new THREE.Mesh(
      sphere,
      new THREE.MeshPhongMaterial({
        color: 0x000000,
        opacity: 0.1,
        transparent: true,
      })
    );
    ball.material.side = THREE.DoubleSide;
    ball.position.y = 0;
    scene.add(ball);
  }

  function islandGenerator() {
    var loader = new GLTFLoader();
    loader.load(
      "./src/jsm/floating_island.glb",
      function (gltf) {
        scene.add(gltf.scene);

        gltf.scene.position.y = -25;
        gltf.scene.scale.y = 100;
        gltf.scene.scale.x = 100;
        gltf.scene.scale.z = 100;
      },
      undefined,
      function (error) {
        console.error("island loading error");
      }
    );
  }

  function rectangleLight() {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(-50, -50, 100);
    light.target.position.set(0, 0, 0);
    scene.add(light);
    scene.add(light.target);
  }

  //generic temporary transform to begin
  tmpTrans = new Ammo.btTransform();
  ammoTmpPos = new Ammo.btVector3();
  ammoTmpQuat = new Ammo.btQuaternion();

  //initialize world and begin
  function start() {
    initPhysicsWorld();
    initGraphics();

    //skyBoxTest();
    //skyBoxSphere();

    createBlock();
    createBall();
    //createBallMask();
    createKinematicBox();
    createJointObjects();

    createWallX(100, -2, 0);
    createWallX(-100, -2, 0);
    createWallZ(0, -2, 100);
    createWallZ(0, -2, -100);

    createBillboard(-95, 0, 20);
    createBillboard(
      -85,
      0,
      -30,
      billboardTextures.terpSolutionsTexture,
      URL.terpsolutions
    );

    createBillboard(-75, 0, -80);
    createBillboard(-6, 0, -90);

    createBox(11.2, 1, -20);
    createTextOnPlane(-25, 0.1, -60, inputText.terpSolutionsText);
    //createTextOnPlane(20, 0.1, inputText.testText);

    createAllTriangles();

    loadRyanText();
    loadEngineerText();

    addParticles();
    //rectangleLight();
    //semiCircleDome();
    islandGenerator();

    lensFlare();

    //updatePhysics();
    setupEventHandlers();
    renderFrame();
  }

  start();
});
