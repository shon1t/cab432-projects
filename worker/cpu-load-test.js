/**
 * CPU Load Generator for Testing Auto Scaling
 * This script generates high CPU load to test auto-scaling policies
 * Run this on worker instances to simulate heavy transcoding load
 */

console.log("Starting CPU load generator...");
console.log("This will generate ~100% CPU load to trigger auto-scaling");
console.log("Press Ctrl+C to stop\n");

let startTime = Date.now();

// Function to generate continuous CPU load
function generateCPULoad() {
  while (true) {
    // CPU-intensive calculations
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(Math.random() * 1000000);
      Math.pow(Math.random(), 3);
      Math.sin(Math.random() * Math.PI);
    }
    
    // Log progress every ~10 seconds
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed % 10 === 0) {
      console.log(`CPU load running... (${elapsed} seconds elapsed)`);
    }
  }
}

// Start generating load
console.log("CPU load generation started!\n");
generateCPULoad();
