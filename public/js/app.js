let authToken = localStorage.getItem("authToken");

let cachedLogin = {}; // store values between steps

// Handle initial login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  cachedLogin = { username, password }; // save for later

  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  console.log("Login response:", data);

  if (data.error === "NEW_PASSWORD_REQUIRED") {
    // Show new password form
    document.getElementById("message").textContent = data.message;
    cachedLogin.session = data.session; // store session
    document.getElementById("newPasswordSection").style.display = "block";
  } else if (data.authToken) {
    document.getElementById("message").textContent = "Login successful!";
    localStorage.setItem("authToken", data.authToken);
  } else {
    document.getElementById("message").textContent = "Login failed: " + JSON.stringify(data);
  }
});

// Handle new password submission
document.getElementById("newPasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById("newPassword").value;

  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: cachedLogin.username,
      password: cachedLogin.password,
      newPassword,
      session: cachedLogin.session //pass session from first step
    })
  });

  const data = await res.json();
  console.log("New password response:", data);

  if (data.authToken) {
    document.getElementById("message").textContent = "Password updated & login successful!";
    localStorage.setItem("authToken", data.authToken);
    document.getElementById("newPasswordSection").style.display = "none";
  } else {
    document.getElementById("message").textContent = "Error: " + JSON.stringify(data);
  }
});

//Handle register form
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value;
  const password = document.getElementById("regPassword").value;
  const email = document.getElementById("regEmail").value;

  const res = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email })
  });

  const data = await res.json();
  document.getElementById("registerMessage").innerText = data.message || data.error;
});

// Handle upload form
const uploadForm = document.getElementById("uploadForm");
const downloadLink = document.getElementById("downloadLink");

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("videoFile");
    const formatSelect = document.getElementById("format");
    const format = formatSelect.value;

    const formData = new FormData();
    formData.append("video", fileInput.files[0]);

    // Upload video
    const uploadRes = await fetch("/video/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      document.getElementById("status").innerText = "Upload failed.";
      return;
    }
    
    const uploadData = await uploadRes.json();
    console.log("Upload response:", uploadData);  // debug

    const s3Key = uploadData.s3Key; 
    const videoId = uploadData.videoId; 

    if (!s3Key) {
      document.getElementById("status").innerText = "Upload did not return a key.";
      return;
    }

    // transcode
    const transcodeRes = await fetch("/video/transcode", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ s3Key, format, videoId }), // was filename, format
    });

    if (transcodeRes.ok) {
      const transcodeData = await transcodeRes.json();
      document.getElementById("status").innerText = "Transcoding complete!";
      document.getElementById("downloadLink").innerHTML = `<a href="${transcodeData.downloadUrl}" download>Download Video</a>`;
      } else {
        document.getElementById("status").innerText = "Transcoding failed.";
      }
    });
}

// Handle admin button 
const adminButton = document.getElementById("adminButton");

if (adminButton) {
  adminButton.addEventListener("click", async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in first.");
      return;
    }

    try {
      const buttonRes = await fetch("/admin", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (buttonRes.ok) {
        const html = await buttonRes.text();

        document.open();
        document.write(html);
        document.close();

      } else if (buttonRes.status === 403) {
        alert("Forbidden — only admins can access this page.");
      } else if (buttonRes.status === 401){
        alert("Your session has expired ot your token is invalid.")
      }
    } catch (error) {
      console.error("Error accessing admin page:", error);
      alert("An error occurred while trying to access the admin page.");
    }
  });
}

// Fetch and display user's videos
async function loadVideos() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("You must be logged in first.");
    return;
  }
    

  try {
    const res = await fetch("/video/videos", {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("Failed to fetch videos");
      return;
    }

    const videos = await res.json();
    const listDiv = document.getElementById("videoList");

    console.log("Videos for logged-in user:", videos.videos); // print to console

    if (!listDiv){
      console.error("No videoList element found in the DOM");
      return;
    } 

    listDiv.innerHTML = "";
    videos.videos.forEach(video => {
      const item = document.createElement("div");
      item.innerHTML = `
        <p>
          <b>Video ID:</b> ${video.videoId}<br>
          <b>Input S3 Key:</b> ${video.s3InputKey || "N/A"}<br>
          <b>Output S3 Key:</b> ${video.s3OutputKey || "N/A"}<br>
          <b>Format:</b> ${video.videoFormat || "N/A"}<br>
          <b>Created At:</b> ${video.createdAt}
        </p>
        ${video.s3OutputKey ? `<a href="${video.s3OutputKey}" target="_blank">Download</a>` : ""}
        <hr>
      `;
      listDiv.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading videos:", err);
  }
}

// Run this automatically when user is on the /video page
if (window.location.pathname === "/video") {
  loadVideos();
}

// Hnadle video list button
const videoListButton = document.getElementById("videoListButton");

if (videoListButton) {
  videoListButton.addEventListener("click", loadVideos);
}

// Handle logout button
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    // Remove the JWT from localStorage
    localStorage.removeItem("authToken");

    // Optionally clear any UI elements or status messages
    document.getElementById("status").innerText = "";

    // Redirect user to login page
    window.location.href = "/";
  });
}
