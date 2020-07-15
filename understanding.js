var actions = {};
var keysActions = {
  KeyW: "acceleration",
  KeyS: "braking",
  KeyA: "left",
  KeyD: "right",
};

function tick() {
  requestAnimationFrame(tick);
  var dt = clock.getDelta();
  for (var i = 0; i < syncList.length; i++) syncList[i](dt);
  physicsWorld.stepSimulation(dt, 10);
  controls.update(dt);
  renderer.render(scene, camera);
  time += dt;
  stats.update();
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
    if (vehicleSteering < steeringClamp) vehicleSteering += steeringIncrement;
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

// Raycast Vehicle
var engineForce = 0;
var vehicleSteering = 0;
var breakingForce = 0;
var tuning = new Ammo.btVehicleTuning();
var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
var vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
vehicle.setCoordinateSystem(0, 1, 2);
physicsWorld.addAction(vehicle);
