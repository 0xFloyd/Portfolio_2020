import * as THREE from "three";
import Stats from "stats.js";
import { OrbitControls } from "./OrbitControls";
import { THREEx } from "./THREEx.KeyboardState";
import TWEEN, { Tween } from "@tweenjs/tween.js";
//import Ammo from "ammo.js";
import * as Ammo from "./builds/ammo";
//import { TWEEN } from "@tweenjs/tween.js";

// start Ammo Engine
Ammo().then((Ammo) => {
  //threejs variable declaration
  var clock, scene, camera, renderer, stats;

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
    scene.background = new THREE.Color(0xbfd1e5);

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
    let dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(-1, 1.75, 1);
    dirLight.position.multiplyScalar(100);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    let d = 100;

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
    moveBall();
    moveKinematic();
    updatePhysics(deltaTime);

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

  //setInterval(() => console.log(joystick.getPosition()), 1000);

  function createJoystick(parent) {
    document.getElementById("joystick-wrapper").style.visibility = "visible";
    const maxDiff = 50; //how far drag can go
    const stick = document.createElement("div");
    stick.classList.add("joystick");

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
      event.preventDefault();

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
    grid.material.opacity = 0.2;
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

  // create ball
  function createBall() {
    let pos = { x: 0, y: 0, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 15;

    var marble_loader = new THREE.TextureLoader();
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
    let pos = { x: 1, y: 30, z: 0 };
    let radius = 2;
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 15;

    //ThreeJS create ball
    let ball = new THREE.Mesh(
      new THREE.SphereBufferGeometry(2, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x00ff08 })
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
    let scalingFactor = 20;
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

  function createBillboard(x, y, z) {
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
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./src/jsm/grasslight-small.jpg");
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

    billboardPole.rotation.y = Math.PI * 0.22;

    billboardSign.position.x = x;
    billboardSign.position.y = y + 12.5;
    billboardSign.position.z = z;
    billboardSign.rotation.y = Math.PI * 0.2;

    billboardPole.castShadow = true;
    billboardPole.receiveShadow = true;

    billboardSign.castShadow = true;
    billboardSign.receiveShadow = true;

    scene.add(billboardPole);
    scene.add(billboardSign);
    addRigidPhysics(billboardPole, billboardPoleScale);
    //addRigidPhysics(billboardSign, billboardSignScale);
  }

  function addRigidPhysics(item, itemScale) {
    console.log(item);
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

  function createKinematicBox() {
    let pos = { x: 40, y: 0, z: 5 };
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
    let pos1 = { x: 0, y: 15, z: 0 };
    let pos2 = { x: 0, y: 10, z: 0 };

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
    camera.position.z = ballObject.position.z + 45;
    camera.lookAt(ballObject.position);
  }

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

  let preloadDivs = document.getElementsByClassName("preload");
  let preloadOpactiy = document.getElementById("preload-overlay");
  let postloadDivs = document.getElementsByClassName("postload");
  let startScreenDivs = document.getElementsByClassName("start-screen");
  let startButton = document.getElementById("start-button");

  startButton.addEventListener("click", () => {
    for (let i = 0; i < startScreenDivs.length; i++) {
      startScreenDivs[i].style.visibility = "hidden"; // or
      startScreenDivs[i].style.display = "none";
    }
    if (isTouchscreenDevice()) {
      createJoystick(document.getElementById("joystick-wrapper"));
    }
  });

  /*~~~~~~~~~~~~~~~~~~~~~~~~~                uncomment this and comment debug hide screen for production

  var readyStateCheckInterval = setInterval(function () {
    console.log("readySTateCheckInterval fired");
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

  function debugHideScreen() {
    for (let i = 0; i < preloadDivs.length; i++) {
      preloadDivs[i].style.visibility = "hidden"; // or
      preloadDivs[i].style.display = "none";
    }
    for (let i = 0; i < postloadDivs.length; i++) {
      postloadDivs[i].style.visibility = "hidden"; // or
      postloadDivs[i].style.display = "none";
      preloadOpactiy.style.opacity = 0;
    }
  }
  debugHideScreen();

  //generic temporary transform to begin
  tmpTrans = new Ammo.btTransform();
  ammoTmpPos = new Ammo.btVector3();
  ammoTmpQuat = new Ammo.btQuaternion();

  //initialize world and begin
  function start() {
    initPhysicsWorld();
    initGraphics();

    createBlock();
    createBall();
    createBallMask();
    createKinematicBox();
    createJointObjects();
    createBillboard(-100, 0, 10);
    createBillboard(-75, 0, -20);
    createBillboard(-50, 0, -50);

    //updatePhysics();
    setupEventHandlers();
    renderFrame();
  }

  start();
});
