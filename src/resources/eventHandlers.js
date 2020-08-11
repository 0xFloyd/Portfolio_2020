// create keyboard control event listeners

export let moveDirection = { left: 0, right: 0, forward: 0, back: 0 };

export function setupEventHandlers() {
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

export function isTouchscreenDevice() {
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

export function touchEvent(coordinates) {
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

export function createJoystick(parent) {
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
