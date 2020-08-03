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
  var clock, scene, camera, renderer, controls, stats, particleSystemObject;

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

  //text Meshes to hover
  var textMeshes = [];
  var boxAroundMesh;

  //holds computed Box3's
  var boxArrayTest = [];
  var ballObjectBox3; //box3 for the marble
  var ballComputeBoundingSphere;
  var ballComputeBoundingBox;
  var ballWireMesh;
  var interceptFlag = false;

  //billboardTextures
  let billboardTextures = {};
  billboardTextures.terpSolutionsTexture = "./src/jsm/terpSolutions.png";
  billboardTextures.grassImage = "./src/jsm/grasslight-small.jpg";
  billboardTextures.bagHolderBetsTexture =
    "./src/jsm/Bagholdersbetsbillboard.png";
  billboardTextures.homeSweetHomeTexture =
    "./src/jsm/home-sweet-home-portrait.png";

  //box textures
  let boxTexture = {};
  boxTexture.Github = "./src/jsm/githubLogo.png";
  boxTexture.LinkedIn = "./src/jsm/linkedInLogo.png";
  boxTexture.mail = "./src/jsm/envelope.png";
  boxTexture.globe = "./src/jsm/globe.png";
  boxTexture.reactIcon = "./src/jsm/react.png";
  boxTexture.allSkills = "./src/jsm/allSkills.png";

  //text
  let inputText = {};
  inputText.terpSolutionsText = "./src/jsm/terp-solutions-text.png";
  inputText.activities = "./src/jsm/activities_text.png";
  inputText.bagholderBetsText = "./src/jsm/bagholderbets-text.png";
  inputText.homeSweetHomeText = "./src/jsm/home-sweet-home-text.png";

  //SVG
  let SVG = {};
  SVG.reactLogo = "./src/jsm/react-svg.svg";

  //URLs
  let URL = {};
  URL.terpsolutions = "https://terpsolutions.com/";
  URL.ryanfloyd = "https://ryanfloyd.io";
  URL.bagholderBets = "https://www.bagholderbets.com/welcome";
  URL.homeSweetHomeURL = "https://home-sweet-home-ip.herokuapp.com/";
  URL.gitHub = "https://github.com/MrRyanFloyd";
  URL.LinkedIn = "https://www.linkedin.com/in/ryan-floyd/";
  URL.email = "https://mailto:arfloyd7@gmail.com";
  URL.githubBagholder = "https://github.com/MrRyanFloyd/bagholder-bets";
  URL.githubHomeSweetHome =
    "https://github.com/MrRyanFloyd/home-sweet-127.0.0.1";

  //start button pressed, person has entered 3d environment
  var startButtonPressed = false;
  var callOnceFlag = true; //boolean to only call on first render

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
    //camera.lookAt(scene.position);

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
    hemiLight.color.setHSL(0.6, 0.6, 0.6);
    hemiLight.groundColor.setHSL(0.1, 1, 0.4);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    //Add directional light
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(-10, 100, 50);
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

    dirLight.shadow.camera.far = 15000;

    //Setup the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    //renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.appendChild(renderer.domElement);

    stats = new Stats();
    document.body.appendChild(stats.dom);
    stats.dom.style.opacity = 0.5;

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

    updatePhysics(deltaTime);

    moveParticles();

    renderer.render(scene, camera);
    stats.end();

    // tells browser theres animation, update before the next repaint
    requestAnimationFrame(renderFrame);
  }

  function tweenCameraTest() {
    var from = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    var to = {
      x: camera.position.x,
      y: camera.position.y + 1,
      z: camera.position.z + 2,
    };
    var tween = new TWEEN.Tween(from)
      .to(to, 3000)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(function () {
        //camera.lookAt(ballObject.position);
      })
      .onComplete(function () {
        //camera.lookAt(ballObject.position);
        camera.position.y = 50;
      })
      .start();
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
      event.preventDefault();
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

    //adds white visual helper boxes around text
    /*
    for (let i = 0; i < textMeshes.length; i++) {
      boxAroundMesh = new THREE.BoxHelper(textMeshes[i], 0xffffff);
      scene.add(boxAroundMesh);
      var box = new THREE.Box3();
      box
        .copy(textMeshes[i].geometry.boundingBox)
        .applyMatrix4(textMeshes[i].matrixWorld);
      boxArrayTest.push(box);
    }*/

    startButtonPressed = true;
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
    let pos = { x: 0, y: -0.25, z: 0 };
    let scale = { x: 200, y: 0.5, z: 200 };
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

    var grid = new THREE.GridHelper(200, 20, 0xffffff, 0xffffff);
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
    body.setFriction(4);
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
    email = null
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
      transparent: true,
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
    linkBox.userData = { URL: URLLink, email: email };
    scene.add(linkBox);
    objectsWithLinks.push(linkBox.uuid);

    addRigidPhysics(linkBox, boxScale);
  }

  function createTextOnPlane(x, y, z, inputText, size1, size2) {
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
    //activitiesText.matrixAutoUpdate = false;
    //activitiesText.updateMatrix();
    activitiesText.renderOrder = 1;
    textMeshes.push(activitiesText);
    scene.add(activitiesText);
  }

  function simpleText(x, y, z, inputText, fontSize) {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
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

      textMeshes.push(text);
      scene.add(text);
    });
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
    const wallScale = { x: 0.125, y: 4, z: 200 };

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
    const wallScale = { x: 200, y: 4, z: 0.125 };

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

  function setupTween(position, target, duration) {
    TWEEN.removeAll(); // remove previous tweens if needed

    new TWEEN.Tween(position)
      .to(target, duration)
      .easing(TWEEN.Easing.Bounce.InOut)
      .onUpdate(function () {
        // copy incoming position into capera position
        camera.position.copy(position);
      })
      .start();
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

  //allSkillsSection(70, 0.01, 10, 40, 40, boxTexture.allSkills);
  function rotateCamera(ballPosition) {
    if (
      (ballPosition.position.x < -35 &&
        ballPosition.position.x > -70 &&
        ballPosition.position.z > 0 &&
        ballPosition.position.z < 55) ||
      (ballPosition.position.x < -15 && ballPosition.position.z < -50) ||
      (ballPosition.position.x < 90 &&
        ballPosition.position.x > 50 &&
        ballPosition.position.z > -10 &&
        ballPosition.position.z < 30)
    ) {
      camera.position.x = ballPosition.position.x;
      camera.position.y = ballPosition.position.y + 50;
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

      if (intersectedObjects[0].object.userData.email) {
        var divElement = document.getElementById("tooltip");
        divElement.setAttribute("style", "display: block");

        var tootipWidth = divElement.offsetWidth;
        var tootipHeight = divElement.offsetHeight;
        divElement.setAttribute(
          "style",
          `left: ${pickPosition.x - tootipWidth / 2}px`,
          `top: ${pickPosition.y - tootipHeight - 5}px`
        );
        divElement.innerText = intersectedObjects[0].object.userData.email;

        setTimeout(function () {
          divElement.setAttribute("style", "opacity: 1.0");
        }, 5000);
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

    addLight(0.55, 0.9, 0.5, 10, 20, -100);
    addLight(0.08, 0.8, 0.5, 10, 20, -100);
    addLight(0.995, 0.5, 0.9, 10, 20, -100);

    function addLight(h, s, l, x, y, z) {
      var light = new THREE.DirectionalLight(0xffffff, 0, 0);
      light.color.setHSL(h, s, l);
      light.position.set(x, y, z);

      scene.add(light);

      var lensflare = new Lensflare();
      lensflare.addElement(
        new LensflareElement(textureFlare0, 200, 0, light.color)
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
      vertex.x = getRandomArbitrary(-1100, 1100);
      vertex.y = getRandomArbitrary(-1100, 1100);
      vertex.z = getRandomArbitrary(-1100, -500);
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

        gltf.scene.position.y = -37.5;
        gltf.scene.scale.y = 150;
        gltf.scene.scale.x = 150;
        gltf.scene.scale.z = 150;
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

  function glowingOrb() {
    var sphereGeo = new THREE.SphereGeometry(10, 32, 16);

    //var moonTexture = THREE.ImageUtils.loadTexture( 'images/moon.jpg' );
    var moonMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    var moon = new THREE.Mesh(sphereGeo, moonMaterial);
    scene.add(moon);

    // create custom material from the shader code above
    //   that is within specially labeled script tags
    var customMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: [
        "precision highp float;",

        "uniform vec3 screenPosition;",
        "uniform vec2 scale;",

        "uniform sampler2D occlusionMap;",

        "attribute vec3 position;",
        "attribute vec2 uv;",

        "varying vec2 vUV;",
        "varying float vVisibility;",

        "void main() {",

        "	vUV = uv;",

        "	vec2 pos = position.xy;",

        "	vec4 visibility = texture2D( occlusionMap, vec2( 0.1, 0.1 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.5, 0.1 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.9, 0.1 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.9, 0.9 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.1, 0.9 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) );",
        "	visibility += texture2D( occlusionMap, vec2( 0.5, 0.5 ) );",

        "	vVisibility =        visibility.r / 9.0;",
        "	vVisibility *= 1.0 - visibility.g / 9.0;",
        "	vVisibility *=       visibility.b / 9.0;",

        "	gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );",

        "}",
      ].join("\n"),

      fragmentShader: [
        "precision highp float;",

        "uniform sampler2D map;",
        "uniform vec3 color;",

        "varying vec2 vUV;",
        "varying float vVisibility;",

        "void main() {",

        "	vec4 texture = texture2D( map, vUV );",
        "	texture.a *= vVisibility;",
        "	gl_FragColor = texture;",
        "	gl_FragColor.rgb *= color;",

        "}",
      ].join("\n"),
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    var ballGeometry = new THREE.SphereGeometry(120, 32, 16);
    var ball = new THREE.Mesh(ballGeometry, customMaterial);
    ball.position.x = 0;
    ball.position.y = 10;
    ball.position.z = -100;
    scene.add(ball);
  }

  function floatingLabel(x, y, z, inputMessage) {
    var text_loader = new THREE.FontLoader();

    text_loader.load("./src/jsm/Roboto_Regular.json", function (font) {
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

  function createSkillIcon(boxTexture) {
    let pos = { x: 2, y: 2, z: 2 };
    let boxScale = { x: 4, y: 4, z: 0 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 15;

    const loader = new THREE.TextureLoader(manager);
    const texture = loader.load(boxTexture);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;
    const loadedTexture = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      color: 0xffffff,
      opacity: 1,
    });

    const linkBox = new THREE.Mesh(
      new THREE.BoxBufferGeometry(boxScale.x, boxScale.y, boxScale.z),
      loadedTexture
    );

    linkBox.position.set(pos.x, pos.y, pos.z);
    linkBox.renderOrder = 1;
    linkBox.castShadow = true;
    linkBox.receiveShadow = true;
    scene.add(linkBox);

    //Ammojs Section
    /*do we need these?
    linkBox.userData.physicsBody = body;
    rigidBodies.push(linkBox);*/

    ////////////////////////////////////////////
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    var localInertia = new Ammo.btVector3(0, 0, 0);
    var motionState = new Ammo.btDefaultMotionState(transform);
    let colShape = new Ammo.btBoxShape(
      new Ammo.btVector3(boxScale.x * 0.5, boxScale.y * 0.5, boxScale.z * 0.5)
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

    physicsWorld.addRigidBody(body);

    linkBox.userData.physicsBody = body;
    rigidBodies.push(linkBox);
  }

  function allSkillsSection(x, y, z, xScale, zScale, boxTexture) {
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
    scene.add(linkBox);
  }

  function checkForBallInsidePlane() {
    // raises text in the air if ball is inside text section
    /*
    var boxMesh = new THREE.Box3().setFromObject(ballWireMesh);
    for (let i = 0; i < textMeshes.length; i++) {
      var currentBox = new THREE.Box3().setFromObject(textMeshes[i]);

      if (currentBox.containsBox(boxMesh)) {
        textMeshes[i].position.y = 5;
        textMeshes[i].updateMatrix();
      }
    }*/
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
    //createKinematicBox();
    //createJointObjects();

    createWallX(100, 1.75, 0);
    createWallX(-100, 1.75, 0);
    createWallZ(0, 1.75, 100);
    createWallZ(0, 1.75, -100);

    //createBillboard(-95, 0, 50);
    createBillboard(
      -95,
      2.5,
      -80,
      billboardTextures.terpSolutionsTexture,
      URL.terpsolutions,
      Math.PI * 0.22
    );

    createBillboard(
      -60,
      2.5,
      -85,
      billboardTextures.bagHolderBetsTexture,
      URL.bagholderBets,
      Math.PI * 0.22
    );
    createBox(-52, 2, -85, 4, 4, 1, boxTexture.Github, URL.githubBagholder);

    createBillboardRotated(
      -30,
      1.25,
      -85,
      billboardTextures.homeSweetHomeTexture,
      URL.homeSweetHomeURL,
      Math.PI * 0.15
    );
    createBox(-22, 2, -83, 4, 4, 1, boxTexture.Github, URL.githubHomeSweetHome);

    ryanFloydWords(11.2, 1, -20);
    createTextOnPlane(-83, 0.01, -70, inputText.terpSolutionsText, 20, 20);
    createTextOnPlane(-52, 0.01, -63, inputText.bagholderBetsText, 20, 40);
    createTextOnPlane(-22, 0.01, -61, inputText.homeSweetHomeText, 20, 40);

    createBox(13, 2, -70, 4, 4, 1, boxTexture.Github, URL.gitHub);
    createBox(21, 2, -70, 4, 4, 1, boxTexture.LinkedIn, URL.LinkedIn, 0x0077b5);
    createBox(37, 2, -70, 4, 4, 1, boxTexture.globe, URL.ryanfloyd, 0xffffff);

    createBox(
      29,
      2,
      -70,
      4,
      4,
      1,
      boxTexture.mail,
      "mailto:arfloyd7@gmail.com",
      0xffffff
    );

    floatingLabel(13.125, 4.5, -70, "Github");
    floatingLabel(21.125, 4.5, -70, "LinkedIn");
    floatingLabel(28.875, 4.5, -70, "Email");
    floatingLabel(37, 4.5, -70, "Website");

    //createAllTriangles();

    //createSkillIcon(boxTexture.reactIcon);
    allSkillsSection(70, 0.01, 10, 40, 40, boxTexture.allSkills);
    allSkillsSection(-54, 0.01, 28, 30, 60, inputText.activities);

    loadRyanText();
    loadEngineerText();
    simpleText(24, 0.01, -60, "Click boxes to visit", 1.5);
    simpleText(70, 0.01, -15, "SKILLS", 3);
    simpleText(-55, 0.01, -40, "PROJECTS", 3);
    simpleText(-54, 0.01, 0, "TIMELINE", 3);

    addParticles();
    //rectangleLight();
    //semiCircleDome();
    //islandGenerator();
    //glowingOrb();

    //lensFlare();

    //updatePhysics();
    setupEventHandlers();
    renderFrame();

    //console.log(textMeshes);
  }

  start();
});

/* 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Test code 

Tween test 
 this.angle.items = {
            default: new THREE.Vector3(1.135, - 1.45, 1.15),
            projects: new THREE.Vector3(0.38, - 1.4, 1.63)
        }

        // Value
        this.angle.value = new THREE.Vector3()
        this.angle.value.copy(this.angle.items.default)

        // Set method
        this.angle.set = (_name) =>
        {
            const angle = this.angle.items[_name]
            if(typeof angle !== 'undefined')
            {
                TweenLite.to(this.angle.value, 2, { ...angle, ease: Power1.easeInOut })
            }
        }
*/
