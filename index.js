const {
  SmartSpectraSDK,
  CameraSelection
} = require("@smartspectra/node-sdk");

console.log("Presage SmartSpectra SDK loaded.");

const cameras = SmartSpectraSDK.availableCameras();

console.log("Available cameras:");

cameras.forEach((camera, index) => {
  console.log(`${index + 1}. ${camera.name}`);
});

console.log("SDK preparation completed.");