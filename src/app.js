import * as THREE from "three";
import { OrbitControls } from "./OrbitControls";
import { THREEx } from "./THREEx.KeyboardState";
import TWEEN, { Tween } from "@tweenjs/tween.js";
//import Ammo from "ammo.js";
import * as Ammo from "./builds/ammo";
//import { TWEEN } from "@tweenjs/tween.js";
Ammo().then(function (Ammo) {
  // Detects webgl
  /*
  if ( ! Detector.webgl ) {
    Detector.addGetWebGLMessage();
    document.getElementById( 'container' ).innerHTML = "";
  }*/

  // - Global variables -
  var DISABLE_DEACTIVATION = 4;
  var TRANSFORM_AUX = new Ammo.btTransform();
  var ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

  // Graphics variables
  var container, stats, speedometer;
  var camera, controls, scene, renderer;
  var terrainMesh, texture;
  var clock = new THREE.Clock();
  var materialDynamic, materialStatic, materialInteractive;

  // Physics variables
  var collisionConfiguration;
  var dispatcher;
  var broadphase;
  var solver;
  var physicsWorld;

  var syncList = [];
  var time = 0;
  var objectTimePeriod = 3;
  var timeNextSpawn = time + objectTimePeriod;
  var maxNumObjects = 30;

  // Keybord actions
  var actions = {};
  var keysActions = {
    KeyW: "acceleration",
    KeyS: "braking",
    KeyA: "left",
    KeyD: "right",
  };

  // - Functions -

  function initGraphics() {
    container = document.getElementById("container");
    speedometer = document.getElementById("speedometer");

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.2,
      2000
    );
    camera.position.x = -4.84;
    camera.position.y = 4.39;
    camera.position.z = -35.11;
    camera.lookAt(new THREE.Vector3(0.33, -0.4, 0.85));
    //controls = new OrbitControls(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new OrbitControls(camera, renderer.domElement);

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 5);
    scene.add(dirLight);

    materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
    materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });
    materialInteractive = new THREE.MeshPhongMaterial({ color: 0x990000 });

    container.innerHTML = "";

    container.appendChild(renderer.domElement);
    /*
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );
*/
    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function initPhysics() {
    // Physics configuration
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration
    );
    physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));
  }

  function tick() {
    requestAnimationFrame(tick);
    var dt = clock.getDelta();
    for (var i = 0; i < syncList.length; i++) syncList[i](dt);
    physicsWorld.stepSimulation(dt, 10);
    controls.update(dt);
    renderer.render(scene, camera);
    time += dt;
    //stats.update();
  }

  function keyup(e) {
    if (keysActions[e.code]) {
      actions[keysActions[e.code]] = false;
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
  function keydown(e) {
    if (keysActions[e.code]) {
      actions[keysActions[e.code]] = true;
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  function createBox(pos, quat, w, l, h, mass, friction) {
    var material = mass > 0 ? materialDynamic : materialStatic;
    var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
    var geometry = new Ammo.btBoxShape(
      new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5)
    );

    if (!mass) mass = 0;
    if (!friction) friction = 1;

    var mesh = new THREE.Mesh(shape, material);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    scene.add(mesh);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      geometry,
      localInertia
    );
    var body = new Ammo.btRigidBody(rbInfo);

    body.setFriction(friction);
    //body.setRestitution(.9);
    //body.setDamping(0.2, 0.2);

    physicsWorld.addRigidBody(body);

    if (mass > 0) {
      body.setActivationState(DISABLE_DEACTIVATION);
      // Sync physics and graphics
      function sync(dt) {
        var ms = body.getMotionState();
        if (ms) {
          ms.getWorldTransform(TRANSFORM_AUX);
          var p = TRANSFORM_AUX.getOrigin();
          var q = TRANSFORM_AUX.getRotation();
          mesh.position.set(p.x(), p.y(), p.z());
          mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
      }

      syncList.push(sync);
    }
  }

  function createWheelMesh(radius, width) {
    var t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
    t.rotateZ(Math.PI / 2);
    var mesh = new THREE.Mesh(t, materialInteractive);
    mesh.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(
          width * 1.5,
          radius * 1.75,
          radius * 0.25,
          1,
          1,
          1
        ),
        materialInteractive
      )
    );
    scene.add(mesh);
    return mesh;
  }

  function createChassisMesh(w, l, h) {
    var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
    var mesh = new THREE.Mesh(shape, materialInteractive);
    scene.add(mesh);
    return mesh;
  }

  function createVehicle(pos, quat) {
    // Vehicle contants

    var chassisWidth = 1.8;
    var chassisHeight = 0.6;
    var chassisLength = 4;
    var massVehicle = 800;

    var wheelAxisPositionBack = -1;
    var wheelRadiusBack = 0.4;
    var wheelWidthBack = 0.3;
    var wheelHalfTrackBack = 1;
    var wheelAxisHeightBack = 0.3;

    var wheelAxisFrontPosition = 1.7;
    var wheelHalfTrackFront = 1;
    var wheelAxisHeightFront = 0.3;
    var wheelRadiusFront = 0.35;
    var wheelWidthFront = 0.2;

    var friction = 1000;
    var suspensionStiffness = 20.0;
    var suspensionDamping = 2.3;
    var suspensionCompression = 4.4;
    var suspensionRestLength = 0.6;
    var rollInfluence = 0.2;

    var steeringIncrement = 0.04;
    var steeringClamp = 0.5;
    var maxEngineForce = 2000;
    var maxBreakingForce = 100;

    // Chassis
    var geometry = new Ammo.btBoxShape(
      new Ammo.btVector3(
        chassisWidth * 0.5,
        chassisHeight * 0.5,
        chassisLength * 0.5
      )
    );
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(massVehicle, localInertia);
    var body = new Ammo.btRigidBody(
      new Ammo.btRigidBodyConstructionInfo(
        massVehicle,
        motionState,
        geometry,
        localInertia
      )
    );
    body.setActivationState(DISABLE_DEACTIVATION);
    physicsWorld.addRigidBody(body);
    var chassisMesh = createChassisMesh(
      chassisWidth,
      chassisHeight,
      chassisLength
    );

    // Raycast Vehicle
    var engineForce = 0;
    var vehicleSteering = 0;
    var breakingForce = 0;
    var tuning = new Ammo.btVehicleTuning();
    var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
    var vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
    vehicle.setCoordinateSystem(0, 1, 2);
    physicsWorld.addAction(vehicle);

    // Wheels
    var FRONT_LEFT = 0;
    var FRONT_RIGHT = 1;
    var BACK_LEFT = 2;
    var BACK_RIGHT = 3;
    var wheelMeshes = [];
    var wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
    var wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

    function addWheel(isFront, pos, radius, width, index) {
      var wheelInfo = vehicle.addWheel(
        pos,
        wheelDirectionCS0,
        wheelAxleCS,
        suspensionRestLength,
        radius,
        tuning,
        isFront
      );

      wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
      wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
      wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
      wheelInfo.set_m_frictionSlip(friction);
      wheelInfo.set_m_rollInfluence(rollInfluence);

      wheelMeshes[index] = createWheelMesh(radius, width);
    }

    addWheel(
      true,
      new Ammo.btVector3(
        wheelHalfTrackFront,
        wheelAxisHeightFront,
        wheelAxisFrontPosition
      ),
      wheelRadiusFront,
      wheelWidthFront,
      FRONT_LEFT
    );
    addWheel(
      true,
      new Ammo.btVector3(
        -wheelHalfTrackFront,
        wheelAxisHeightFront,
        wheelAxisFrontPosition
      ),
      wheelRadiusFront,
      wheelWidthFront,
      FRONT_RIGHT
    );
    addWheel(
      false,
      new Ammo.btVector3(
        -wheelHalfTrackBack,
        wheelAxisHeightBack,
        wheelAxisPositionBack
      ),
      wheelRadiusBack,
      wheelWidthBack,
      BACK_LEFT
    );
    addWheel(
      false,
      new Ammo.btVector3(
        wheelHalfTrackBack,
        wheelAxisHeightBack,
        wheelAxisPositionBack
      ),
      wheelRadiusBack,
      wheelWidthBack,
      BACK_RIGHT
    );

    // Sync keybord actions and physics and graphics
    function sync(dt) {
      var speed = vehicle.getCurrentSpeedKmHour();

      speedometer.innerHTML =
        (speed < 0 ? "(R) " : "") + Math.abs(speed).toFixed(1) + " km/h";

      breakingForce = 0;
      engineForce = 0;

      if (actions.acceleration) {
        if (speed < -1) breakingForce = maxBreakingForce;
        else engineForce = maxEngineForce;
      }
      if (actions.braking) {
        if (speed > 1) breakingForce = maxBreakingForce;
        else engineForce = -maxEngineForce / 2;
      }
      if (actions.left) {
        if (vehicleSteering < steeringClamp)
          vehicleSteering += steeringIncrement;
      } else {
        if (actions.right) {
          if (vehicleSteering > -steeringClamp)
            vehicleSteering -= steeringIncrement;
        } else {
          if (vehicleSteering < -steeringIncrement)
            vehicleSteering += steeringIncrement;
          else {
            if (vehicleSteering > steeringIncrement)
              vehicleSteering -= steeringIncrement;
            else {
              vehicleSteering = 0;
            }
          }
        }
      }

      vehicle.applyEngineForce(engineForce, BACK_LEFT);
      vehicle.applyEngineForce(engineForce, BACK_RIGHT);

      vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
      vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
      vehicle.setBrake(breakingForce, BACK_LEFT);
      vehicle.setBrake(breakingForce, BACK_RIGHT);

      vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
      vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);

      var tm, p, q, i;
      var n = vehicle.getNumWheels();
      for (i = 0; i < n; i++) {
        vehicle.updateWheelTransform(i, true);
        tm = vehicle.getWheelTransformWS(i);
        p = tm.getOrigin();
        q = tm.getRotation();
        wheelMeshes[i].position.set(p.x(), p.y(), p.z());
        wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
      }

      tm = vehicle.getChassisWorldTransform();
      p = tm.getOrigin();
      q = tm.getRotation();
      chassisMesh.position.set(p.x(), p.y(), p.z());
      chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }

    syncList.push(sync);
  }

  function createObjects() {
    createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 75, 1, 75, 0, 2);

    var quaternion = new THREE.Quaternion(0, 0, 0, 1);
    quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
    createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);

    var size = 0.75;
    var nw = 8;
    var nh = 6;
    for (var j = 0; j < nw; j++)
      for (var i = 0; i < nh; i++)
        createBox(
          new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10),
          ZERO_QUATERNION,
          size,
          size,
          size,
          10
        );

    createVehicle(new THREE.Vector3(0, 4, -20), ZERO_QUATERNION);
  }

  // - Init -
  initGraphics();
  initPhysics();
  createObjects();
  tick();
});

//import { THREEx } from "./THREEx.KeyboardState";
//import * as dat from "dat.gui";

console.log(typeof collision);

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

//global variables
var camera, scene, renderer, container, controls, stats;

var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
// custom global variables
var cube;

init();
animate();

function init() {
  // SCENE

  scene = new THREE.Scene();

  container = document.createElement("div");
  document.body.appendChild(container);

  // CAMERA

  camera = new THREE.PerspectiveCamera(
    45,
    SCREEN_WIDTH / SCREEN_HEIGHT,
    0.1,
    20000
  );

  camera.position.set(0, 150, 400);
  camera.lookAt(scene.position);

  // LIGHTS

  var light = new THREE.DirectionalLight(0xaabbff, 0.5);
  scene.add(light);

  //grass ground
  var grass_loader = new THREE.TextureLoader();
  var groundTexture = grass_loader.load("./src/jsm/grasslight-big.jpg");
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(5, 5);
  groundTexture.anisotropy = 16;
  groundTexture.encoding = THREE.sRGBEncoding;

  var groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });

  var mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(500, 500),
    groundMaterial
  );
  mesh.position.y = 0;
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // CUBE

  const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
  const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
  MovingCube = new THREE.Mesh(cubeGeometry, material);
  scene.add(MovingCube);
  // RENDERER

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  container.appendChild(renderer.domElement);
  renderer.outputEncoding = THREE.sRGBEncoding;

  // CONTROLS

  controls = new OrbitControls(camera, renderer.domElement);
  /*
  controls.maxPolarAngle = (0.95 * Math.PI) / 2;
  controls.minPolarAngle = (0.3 * Math.PI) / 2;
  controls.enableZoom = true;
  controls.minDistance = 50;
  controls.maxDistance = 1000;

  // limit panning
  var minPan = new THREE.Vector3(-500, -500, -500);
  var maxPan = new THREE.Vector3(500, 0, 0);
  var panning_vector = new THREE.Vector3();

  controls.addEventListener("change", function () {
    panning_vector.copy(controls.target);
    controls.target.clamp(minPan, maxPan);
    panning_vector.sub(controls.target);
    camera.position.sub(panning_vector);
  });
*/
  var text_loader = new THREE.FontLoader();

  text_loader.load("./src/jsm/helvetiker_regular.typeface.json", function (
    font
  ) {
    var xMid, text;

    var color = 0xff6600;

    var matLite = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    var message = "   Three.js\nSimple text.";

    var shapes = font.generateShapes(message, 10);

    var geometry = new THREE.ShapeBufferGeometry(shapes);

    geometry.computeBoundingBox();

    xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);

    // make shape ( N.B. edge view not visible )

    text = new THREE.Mesh(geometry, matLite);
    text.position.z = 0;
    text.position.y = 20;
    scene.add(text);
  }); //end load function

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  update();
  //TWEEN.update();
  renderer.render(scene, camera);
}

var MovingCube;

//TWEEN TODO
/*
NOTE: have to call TWEEN.update() somewhere 

var coords = { x: 0, y: 0 };
var tween = new TWEEN.Tween(MovingCube.position)
  .to({ x: 100, y: 100 }, 2000, TWEEN.Easing.Exponential)
  .onUpdate(function () {
    
    console.log(MovingCube.position.y);
  })
  .start();
tween.onComplete(function () {
  console.log("done!");
 
});
*/

function update() {
  var delta = clock.getDelta(); // seconds.
  var moveDistance = 100 * delta; // 200 pixels per second
  var rotateAngle = (Math.PI / 2) * delta; // pi/2 radians (90 degrees) per second
  var velocity = new THREE.Vector3();
  velocity.y -= 9.8 * 100.0 * delta;

  ///~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~left off here with tween 6/30/20

  // local transformations

  // move forwards/backwards/left/right
  if (keyboard.pressed("up")) MovingCube.translateZ(-moveDistance);
  if (keyboard.pressed("W")) MovingCube.translateZ(-moveDistance);

  if (keyboard.pressed("down")) MovingCube.translateZ(moveDistance);
  if (keyboard.pressed("S")) MovingCube.translateZ(moveDistance);

  if (keyboard.pressed("left")) MovingCube.translateX(-moveDistance);
  if (keyboard.pressed("right")) MovingCube.translateX(moveDistance);

  // only on keydown

  // rotate left/right/up/down
  var rotation_matrix = new THREE.Matrix4().identity();
  if (keyboard.pressed("A"))
    MovingCube.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateAngle);
  if (keyboard.pressed("D"))
    MovingCube.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotateAngle);
  if (keyboard.pressed("R"))
    MovingCube.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateAngle);
  if (keyboard.pressed("F"))
    MovingCube.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotateAngle);

  if (keyboard.pressed("Z")) {
    MovingCube.position.set(0, 0, 0);
    MovingCube.rotation.set(0, 0, 0);
  }

  var relativeCameraOffset = new THREE.Vector3(0, 50, 200);

  var cameraOffset = relativeCameraOffset.applyMatrix4(MovingCube.matrixWorld);

  camera.position.x = cameraOffset.x;
  camera.position.y = cameraOffset.y;
  camera.position.z = cameraOffset.z;
  camera.lookAt(MovingCube.position);

  camera.updateMatrix();
  camera.updateProjectionMatrix();

  //stats.update();
}
