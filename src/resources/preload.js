export let preloadDivs = document.getElementsByClassName("preload");
export let preloadOpactiy = document.getElementById("preload-overlay");
export let postloadDivs = document.getElementsByClassName("postload");
export let startScreenDivs = document.getElementsByClassName("start-screen");
export let startButton = document.getElementById("start-button");

export function noWebGL() {
  for (let i = 0; i < preloadDivs.length; i++) {
    preloadDivs[i].style.visibility = "hidden"; // or
    preloadDivs[i].style.display = "none";
  }
  for (let i = 0; i < postloadDivs.length; i++) {
    // or
    postloadDivs[i].style.display = "none";
  }
  document.getElementById("preload-overlay").style.display = "none";
  var warning = WEBGL.getWebGLErrorMessage();
  var a = document.createElement("a");
  var linkText = document.createTextNode("Click here to visit my static site");
  a.appendChild(linkText);
  a.title = "Static Site";
  a.href = "https://ryanfloyd.io";
  a.style.margin = "0px auto";
  a.style.textAlign = "center";
  document.getElementById("WEBGLcontainer").appendChild(warning);
  document.getElementById("WEBGLcontainer").appendChild(a);
}

//loading page section
export function startButtonEventListener() {
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

  //startButtonPressed = true;
}
