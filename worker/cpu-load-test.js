/**
 * CPU Load Generator for Testing Auto Scaling
 * This script generates high CPU load to test auto-scaling policies
 * Run this on worker instances to simulate heavy transcoding load
 */

console.log("Starting CPU load generator...");
console.log("This will generate ~90% CPU load to trigger auto-scaling");
console.log("Press Ctrl+C to stop");

// Function to generate CPU load
function generateCPULoad() {
  const startTime = Date.now();
  const duration = 5000; // 5 seconds of intense calculation
  
  while (Date.now() - startTime < duration) {
    // Perform CPU-intensive calculations
    Math.sqrt(Math.random() * 1000000);
    Math.pow(Math.random(), Math.random());
    JSON.stringify({ data: Math.random() });
  }
  
  // Brief pause to prevent complete lockup
  setTimeout(generateCPULoad, 100);
}

// Monitor CPU usage
let iterations = 0;
setInterval(() => {
  iterations++;
  console.log(`Running for ${iterations * 10} seconds - Check CloudWatch metrics`);
}, 10000);

// Start generating load
console.log("\nCPU load generation started!\n");
generateCPULoad();
